'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  Unplug, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings
} from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import { isAdminOrHigher } from '@/lib/permissions';

// Google Logo Component
const GoogleLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="24"
    height="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface GoogleIntegration {
  id: string;
  integration_id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  connected_at?: string;
  config?: {
    user_info?: {
      email: string;
      name: string;
      picture?: string;
    };
  };
  error_message?: string;
}

interface GoogleOAuthSettingsProps {
  companyId: string;
  onIntegrationChange?: () => void;
}

export function GoogleOAuthSettings({ companyId, onIntegrationChange }: GoogleOAuthSettingsProps) {
  const company = useActiveCompany();
  const hasAdminPermission = isAdminOrHigher(company?.userRole);
  
  const [integration, setIntegration] = useState<GoogleIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Google integration status
  const fetchGoogleIntegration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/company/${companyId}/integrations`);
      const data = await response.json();
      
      if (data.success) {
        // Find Google integration
        const googleIntegration = data.data.find((int: any) => 
          int.integration?.integration_key === 'google'
        );
        
        if (googleIntegration) {
          setIntegration({
            id: googleIntegration.id,
            integration_id: googleIntegration.integration_id,
            name: googleIntegration.name,
            status: googleIntegration.status,
            connected_at: googleIntegration.connected_at,
            config: googleIntegration.config,
            error_message: googleIntegration.error_message,
          });
        } else {
          setIntegration(null);
        }
      }
    } catch (error) {
      console.error('Error fetching Google integration:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleIntegration();
  }, [companyId]);

  const handleConnect = async () => {
    if (!hasAdminPermission) return;

    try {
      setConnecting(true);
      
      // Get OAuth URL
      const response = await fetch(`/api/integrations/google/auth/${companyId}`);
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        alert('Failed to initiate Google OAuth');
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      alert('Failed to connect to Google');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!hasAdminPermission || !integration) return;

    if (!confirm('Are you sure you want to disconnect Google? This will revoke access to all Google services.')) {
      return;
    }

    try {
      setDisconnecting(true);
      
      const response = await fetch(
        `/api/company/${companyId}/integrations?integrationId=${integration.integration_id}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setIntegration(null);
        onIntegrationChange?.();
        alert('Google integration disconnected successfully');
      } else {
        alert(data.message || 'Failed to disconnect Google integration');
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      alert('Failed to disconnect Google integration');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshTokens = async () => {
    if (!integration) return;

    try {
      setRefreshing(true);
      
      const response = await fetch('/api/integrations/google/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          integrationId: integration.integration_id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchGoogleIntegration();
        onIntegrationChange?.();
        alert('Google tokens refreshed successfully');
      } else {
        alert(data.error || 'Failed to refresh tokens');
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      alert('Failed to refresh tokens');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    if (!integration) return <XCircle className="h-4 w-4 text-gray-500" />;
    
    switch (integration.status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!integration) {
      return <Badge variant="secondary" className='bg-red-500'>Not Connected</Badge>;
    }

    switch (integration.status) {
      case 'connected':
        return <Badge variant="default">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GoogleLogo className="w-6 h-6" />
            Google Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GoogleLogo className="w-6 h-6" />
          Google Services
          {getStatusIcon()}
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Connect your Google account to enable access to Google Ads, Sheets, Gmail, and Analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration?.config?.user_info && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              {integration.config.user_info.picture && (
                <img
                  src={integration.config.user_info.picture}
                  alt={integration.config.user_info.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  {integration.config.user_info.name}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {integration.config.user_info.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {integration?.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {integration.error_message}
            </AlertDescription>
          </Alert>
        )}

        {integration?.connected_at && (
          <div className="text-sm text-muted-foreground">
            Connected on {new Date(integration.connected_at).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2">
          {!integration ? (
            hasAdminPermission ? (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Google
                  </>
                )}
              </Button>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground py-2 px-3 bg-muted rounded-lg text-center">
                Admin permission required to connect Google services
              </div>
            )
          ) : (
            <>
              {integration.status === 'error' && hasAdminPermission && (
                <Button
                  variant="outline"
                  onClick={handleRefreshTokens}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {hasAdminPermission && (
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}