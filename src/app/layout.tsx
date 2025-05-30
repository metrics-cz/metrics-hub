// src/app/layout.tsx
import {AuthProvider} from '@/components/AuthProvider';
import '@/global.css'
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Metrics Hub',
  description: 'Moderní minimalistický dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="h-full">
      <head>
        {/* Google Fonts – Inter 400/500/700 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
        />
      </head>
      <body className="h-full antialiased bg-bg-light text-neutral-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
