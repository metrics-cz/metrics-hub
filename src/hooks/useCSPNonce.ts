/**
 * React hook for accessing CSP nonce in components
 */

import React, { useEffect, useState } from 'react';

export function useCSPNonce(): string | null {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Try to get nonce from meta tag (if set by the server)
    const metaNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content');
    if (metaNonce) {
      setNonce(metaNonce);
      return;
    }

    // Fallback: try to extract from existing script tag
    const scripts = document.querySelectorAll('script[nonce]');
    if (scripts.length > 0) {
      const firstScript = scripts[0] as HTMLScriptElement;
      setNonce(firstScript.getAttribute('nonce'));
    }
  }, []);

  return nonce;
}

// Utility function to get nonce for inline styles
export function getInlineStyleWithNonce(css: string, nonce?: string | null): React.CSSProperties & { nonce?: string } {
  const style = { 
    // Convert CSS string to style object if needed
    // For now, return empty object as this would need CSS parser
  } as React.CSSProperties;

  if (nonce) {
    (style as any).nonce = nonce;
  }

  return style;
}

// Component wrapper that adds nonce to children
interface CSPSafeProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any;
}

export function CSPSafe({ children, as: Component = 'div', ...props }: CSPSafeProps) {
  const nonce = useCSPNonce();

  const enhancedProps = {
    ...props,
    ...(nonce && { nonce })
  };

  return React.createElement(Component, enhancedProps, children);
}