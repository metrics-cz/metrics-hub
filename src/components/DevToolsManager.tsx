/**
 * Development Tools Manager
 * Helps manage and control development tools like Vercel Live
 */

'use client';

import { useEffect, useState } from 'react';

interface DevToolsManagerProps {
  children: React.ReactNode;
}

export function DevToolsManager({ children }: DevToolsManagerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only run in development mode
    if (process.env.NODE_ENV === 'development') {
      // Check for Vercel Live and add styles if needed
      const checkVercelLive = () => {
        const vercelElements = document.querySelectorAll('[data-vercel-live], [class*="vercel"], [id*="vercel"]');
        
        if (vercelElements.length > 0) {
          console.log('🔧 Vercel Live detected, applying fallback styles...');
          
          // Add fallback styles for unstyled Vercel Live elements
          const style = document.createElement('style');
          style.id = 'vercel-live-fallback-styles';
          style.textContent = `
            /* Fallback styles for Vercel Live elements */
            [data-vercel-live] {
              position: fixed !important;
              top: 10px !important;
              right: 10px !important;
              z-index: 9999 !important;
              background: #000 !important;
              color: #fff !important;
              padding: 8px 12px !important;
              border-radius: 6px !important;
              font-size: 12px !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              border: 1px solid #333 !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            }
            
            /* Hide unstyled dev tools that appear at top */
            body > div:first-child:empty,
            body > div:first-child[style*="position: absolute"][style*="top: 0"] {
              display: none !important;
            }
            
            /* Fix for Next.js development overlay */
            [data-nextjs-toast] {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
            
            /* Vercel toolbar fixes */
            [class*="__vercel"] {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              background: #000 !important;
              color: #fff !important;
            }
          `;
          
          // Remove existing fallback styles before adding new ones
          const existing = document.getElementById('vercel-live-fallback-styles');
          if (existing) {
            existing.remove();
          }
          
          document.head.appendChild(style);
        }
      };

      // Check immediately and after DOM changes
      checkVercelLive();
      
      // Watch for dynamic elements being added
      const observer = new MutationObserver(() => {
        checkVercelLive();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => {
        observer.disconnect();
      };
    }
    
    // Return cleanup function for non-development mode too
    return () => {};
  }, []);

  // Don't render children until client-side to avoid hydration issues
  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}

// Hook to disable Vercel Live if needed
export function useDisableVercelLive() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add URL parameter to disable Vercel Live if it's causing issues
      const url = new URL(window.location.href);
      if (url.searchParams.get('disable-vercel-live') === 'true') {
        console.log('🚫 Disabling Vercel Live via URL parameter');
        
        // Block Vercel Live scripts
        const style = document.createElement('style');
        style.textContent = `
          [src*="vercel.live"] { display: none !important; }
          [href*="vercel.live"] { display: none !important; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);
}

// Component to show development tools status
export function DevToolsStatus() {
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const detectedTools = [];
      
      // Check for various development tools
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        detectedTools.push('React DevTools');
      }
      
      if (document.querySelector('[data-vercel-live]')) {
        detectedTools.push('Vercel Live');
      }
      
      if (document.querySelector('[data-nextjs-toast]')) {
        detectedTools.push('Next.js Toast');
      }
      
      if ((window as any).__NEXT_DATA__) {
        detectedTools.push('Next.js Development Mode');
      }
      
      setTools(detectedTools);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || tools.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black text-white text-xs p-2 rounded opacity-50 hover:opacity-100 z-50">
      <div className="font-semibold">Dev Tools Active:</div>
      {tools.map(tool => (
        <div key={tool}>• {tool}</div>
      ))}
    </div>
  );
}