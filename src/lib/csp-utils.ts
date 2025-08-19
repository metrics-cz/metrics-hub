/**
 * Content Security Policy utilities
 * Handles nonce generation and CSP configuration
 */

import { NextRequest } from 'next/server';

// Generate a cryptographically secure nonce (Edge Runtime compatible)
export function generateNonce(): string {
  // Use Web Crypto API which is available in Edge Runtime
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// Store nonces in request headers for access in components
export function setNonce(request: NextRequest, nonce: string): void {
  request.headers.set('X-CSP-Nonce', nonce);
}

export function getNonce(request: NextRequest): string | null {
  return request.headers.get('X-CSP-Nonce');
}

// Known legitimate script hashes from the CSP violation errors
export const LEGITIMATE_SCRIPT_HASHES = [
  'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=', // Next.js hydration
  'sha256-KCeOGoptLKX0KFYDzoFrnlBfPmI2Rw2mUALiVmJ3cZ8=', // Next.js router
  'sha256-UchRxsxvfN6Uvrg1dyLntQNtg8gNaP7nc6ZjTM0KOdQ=', // Next.js app
  'sha256-0yM/aP//NdpOe6teudEVt4FHmXgESeolckIuh04UXrM=', // Next.js client
  'sha256-/XU2hFEkxI0yyRedT2YMwE9F8NU2Aeu8GmPm9NVXt5A=', // Next.js runtime
  'sha256-X41MaERB81HHOfXKPzz4tXi+RAILrdK/MxtuHUrw/E0=', // Next.js chunks
  'sha256-ZmuW9Ie13QnaG2zv8ayetMRk9xr2uJkUEWjfMs61qUc=', // Next.js utils
  'sha256-A4MAASuBhmSvR+YZjH1P1BjAu2SgJQ1Js7ICE/t+KWs=', // Next.js polyfills
  'sha256-Cg/a74h1YHfGslY/gTb/GEBSYGQteHuDYQ8U+BVecok=', // Next.js modules
  'sha256-KN38sGt42m0xDmjt8LNY5scpQbr5bvM83enIv5WWHHU=', // Next.js components
  'sha256-ZswfTY7H35rbv8WC7NXBoiC7WNu86vSzCDChNWwZZDM=', // Next.js webpack
];

// Known legitimate style hashes (add as needed)
export const LEGITIMATE_STYLE_HASHES = [
  'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=', // Empty style
];

// Environment-specific CSP configuration
export function getCSPConfig(isDevelopment: boolean, nonce?: string) {
  // Much more permissive CSP for development to avoid styling issues
  if (isDevelopment) {
    return {
      "default-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:", "blob:", "https:", "http:", "ws:", "wss:"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:", "blob:", "https:", "http:"],
      "style-src": ["'self'", "'unsafe-inline'", "data:", "blob:", "https:", "http:"],
      "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "font-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "connect-src": ["'self'", "data:", "blob:", "https:", "http:", "ws:", "wss:"],
      "frame-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "frame-ancestors": ["'self'"],
      "object-src": ["'none'"],
      "media-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "worker-src": ["'self'", "blob:", "data:"],
      "child-src": ["'self'", "blob:", "data:"],
    };
  }

  // Production CSP - more restrictive
  const scriptSources = [
    "'self'",
    ...LEGITIMATE_SCRIPT_HASHES.map(hash => `'${hash}'`),
    'https://vercel.live',
  ];

  const styleSources = [
    "'self'",
    "'unsafe-inline'", // Still needed for styled-components and Tailwind
    ...LEGITIMATE_STYLE_HASHES.map(hash => `'${hash}'`),
    'https://fonts.googleapis.com',
  ];

  // Add nonce if provided
  if (nonce) {
    scriptSources.push(`'nonce-${nonce}'`);
    styleSources.push(`'nonce-${nonce}'`);
  }

  return {
    "default-src": ["'self'"],
    "script-src": scriptSources,
    "style-src": styleSources,
    "img-src": [
      "'self'",
      "data:",
      "https:",
      "blob:",
      "https://*.supabase.co",
      "https://lh3.googleusercontent.com", // Google profile pictures
    ],
    "font-src": [
      "'self'",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com",
    ],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.vercel.com",
      "https://oauth2.googleapis.com",
      "https://www.googleapis.com",
    ],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "media-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "worker-src": ["'self'", "blob:", "data:"],
    "child-src": ["'self'", "blob:", "data:"],
  };
}

// Convert CSP config object to header string
export function cspConfigToString(config: Record<string, string[]>): string {
  return Object.entries(config)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Generate complete CSP header
export function generateCSPHeader(isDevelopment: boolean, nonce?: string): string {
  const config = getCSPConfig(isDevelopment, nonce);
  return cspConfigToString(config);
}

// CSP violation reporting (optional)
export function getCSPReportConfig(reportUri?: string) {
  if (!reportUri) return {};
  
  return {
    "report-uri": [reportUri],
    "report-to": ["csp-endpoint"],
  };
}