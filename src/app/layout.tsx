// src/app/layout.tsx
import {AuthProvider} from '@/components/auth/AuthProvider';
import {ThemeProvider} from '@/components/providers/ThemeProvider';
import '@/global.css'
import type { ReactNode } from 'react';

export const metadata = {
 title: 'Metrics Hub',
 description: 'Moderní minimalistický dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
 return (
  <html className="h-full" suppressHydrationWarning>
   <body
    className="h-full antialiased bg-white text-primary"
    suppressHydrationWarning
   >
    <ThemeProvider>
     <AuthProvider>
      {children}
     </AuthProvider>
    </ThemeProvider>
   </body>
  </html>
 );
}
