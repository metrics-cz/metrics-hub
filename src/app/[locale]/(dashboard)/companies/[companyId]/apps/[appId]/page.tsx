'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, AlertCircle, FileText, Activity } from 'lucide-react';
import { cachedApi } from '@/lib/cachedApi';
import { CompanyApplication } from '@/lib/applications';
import { createClient } from '@supabase/supabase-js';
import { LogsViewer } from '@/components/integration-logs/LogsViewer';

export default function IframeAppPage() {
 const params = useParams();
 const router = useRouter();
 const companyId = params?.companyId as string;
 const appId = params?.appId as string;
 const locale = params?.locale as string;
 
 const [app, setApp] = useState<CompanyApplication | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'app' | 'logs'>('app');
 const iframeRef = useRef<HTMLIFrameElement>(null);

 useEffect(() => {
  const fetchApp = async () => {
   if (!companyId || !appId) return;

   try {
    setLoading(true);
    const apps = await cachedApi.fetchCompanyApplications(companyId);
    const foundApp = apps.find(ca => ca.application_id === appId);
    
    if (!foundApp) {
     setError('Application not found or not installed');
     return;
    }

    setApp(foundApp);
   } catch (err) {
    console.error('Error fetching app:', err);
    setError('Failed to load application');
   } finally {
    setLoading(false);
   }
  };

  fetchApp();
 }, [companyId, appId]);

 // OAuth token passing system
 useEffect(() => {
  if (!app || !iframeRef.current) return;

  const sendTokensToIframe = async () => {
   try {
    // Fetch OAuth tokens for this company
    const response = await fetch(`/api/companies/${companyId}/oauth-tokens`);
    const tokens = response.ok ? await response.json() : null;

    console.log('Sending tokens to iframe:', { companyId, tokens: tokens ? 'present' : 'false', tokenDetails: tokens });

    // Send initial configuration to iframe
    const messageData = {
     type: 'METRICSHUB_CONFIG',
     payload: {
      companyId,
      apiBaseUrl: window.location.origin, // Remove '/api' suffix to prevent double prefix
      oauthTokens: tokens,
      appId,
      timestamp: Date.now()
     }
    };

    // Wait a moment for iframe to load
    setTimeout(() => {
     iframeRef.current?.contentWindow?.postMessage(messageData, '*');
    }, 1000);

    // Send tokens periodically or on demand
    const tokenInterval = setInterval(() => {
     iframeRef.current?.contentWindow?.postMessage(messageData, '*');
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(tokenInterval);
   } catch (error) {
    console.error('Error sending tokens to iframe:', error);
    return () => {}; // Return empty cleanup function on error
   }
  };

  sendTokensToIframe();

  // Listen for messages from iframe
  const handleMessage = async (event: MessageEvent) => {
   if (event.data?.type === 'METRICSHUB_TOKEN_REQUEST') {
    console.log('Iframe requested token refresh');
    await sendTokensToIframe();
   } else if (event.data?.type === 'METRICSHUB_IFRAME_READY') {
    console.log('Iframe is ready, sending initial config');
    await sendTokensToIframe();
   } else if (event.data?.type === 'METRICSHUB_CONSOLE_LOG') {
    // Forward console messages from iframe to parent console with iframe prefix
    const { method, args, source } = event.data;
    const prefix = `[🖼️ IFRAME]`;
    
    if (method === 'error') {
     console.error(prefix, ...args);
    } else if (method === 'warn') {
     console.warn(prefix, ...args);
    } else if (method === 'info') {
     console.info(prefix, ...args);
    } else {
     console.log(prefix, ...args);
    }
   }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
 }, [app, companyId, appId]);

 if (loading) {
  return (
   <div className="h-full flex items-center justify-center bg-white ">
    <div className="flex flex-col items-center gap-4">
     <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
     <p className="text-secondary">Loading application...</p>
    </div>
   </div>
  );
 }

 if (error || !app) {
  return (
   <div className="h-full flex items-center justify-center bg-white ">
    <div className="text-center">
     <AlertCircle className="w-16 h-16 text-muted mx-auto mb-4" />
     <h2 className="text-xl font-semibold text-primary mb-2">
      Application Error
     </h2>
     <p className="text-secondary mb-6">
      {error || 'Application not found'}
     </p>
     <button
      onClick={() => router.push(`/${locale}/companies/${companyId}/apps`)}
      className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
     >
      Back to Apps
     </button>
    </div>
   </div>
  );
 }

 const application = app.application;
 if (!application) {
  return (
   <div className="h-full flex items-center justify-center bg-white ">
    <div className="text-center">
     <AlertCircle className="w-16 h-16 text-muted mx-auto mb-4" />
     <h2 className="text-xl font-semibold text-primary mb-2">
      Invalid Application
     </h2>
     <p className="text-secondary mb-6">
      Application data is missing
     </p>
     <button
      onClick={() => router.push(`/${locale}/companies/${companyId}/apps`)}
      className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
     >
      Back to Apps
     </button>
    </div>
   </div>
  );
 }

 // Get iframe URL from various possible sources
 const getIframeUrl = () => {
  // Priority order: app config > app settings > application metadata > default
  let url = app.config?.iframe_url || 
       app.settings?.iframe_url || 
       application.metadata?.iframe_url;
  
  // If no URL configured, use extraction API that runs the app
  if (!url) {
   // Use API route that extracts ZIP, installs dependencies, and runs the app
   // Include index.html path to properly match the [...path] route pattern
   url = `/api/app-storage/apps/${application.id}/index.html`;
  }
  
  return url;
 };

 const iframeUrl = getIframeUrl();

 return (
  <div className="flex flex-col h-screen bg-white ">
   {/* Header */}
   <div className="border-b border-border-light bg-card shrink-0">
    <div className="flex items-center justify-between p-3"> <div className="flex items-center gap-3">
      <button
       onClick={() => router.push(`/${locale}/companies/${companyId}/apps`)}
       className="p-1.5 hover:bg-hover rounded-lg transition-colors"
      >
       <ArrowLeft className="w-5 h-5 text-secondary" />
      </button>

      <div className="flex items-center gap-2">
       <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
        <span className="text-accent font-semibold text-sm">
         {application.name.charAt(0).toUpperCase()}
        </span>
       </div>
       <div>
        <h1 className="font-medium text-primary text-sm">
         {application.name}
        </h1>
       </div>
      </div>
     </div>

     {activeTab === 'app' && (
      <button
       onClick={() => window.open(iframeUrl, '_blank')}
       className="flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:text-primary hover:text-primary transition-colors rounded-md hover:bg-hover"
      >
       <ExternalLink className="w-3 h-3" />
       New Tab
      </button>
     )}
    </div>

    {/* Tab Navigation */}
    <div className="flex border-t border-border-light">
     <button
      onClick={() => setActiveTab('app')}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
       activeTab === 'app'
        ? 'border-emerald-500 text-accent bg-emerald-50'
        : 'border-transparent text-muted hover:text-primary hover:text-secondary hover:border-border-default'
      }`}
     >
      <Activity className="w-4 h-4" />
      Application
     </button>
     <button
      onClick={() => setActiveTab('logs')}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
       activeTab === 'logs'
        ? 'border-emerald-500 text-accent bg-emerald-50'
        : 'border-transparent text-muted hover:text-primary hover:text-secondary hover:border-border-default'
      }`}
     >
      <FileText className="w-4 h-4" />
      Integration Logs
     </button>
    </div>
   </div>

   {/* Main Content Area */}
   <div className="flex-1 w-full h-full overflow-hidden">
    {activeTab === 'app' ? (
     <iframe
      ref={iframeRef}
      src={iframeUrl}
      className="w-full h-full border-none bg-white"
      title={application.name}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-storage-access-by-user-activation"
      allow="clipboard-read; clipboard-write; web-share"
     />
    ) : (
     <div className="h-full bg-base">
      <LogsViewer
       companyId={companyId}
       integrationName={application.name}
       height="100%"
       showFilters={true}
       showExport={true}
       autoRefresh={true}
       refreshInterval={10000}
      />
     </div>
    )}
   </div>
  </div>
 );
}