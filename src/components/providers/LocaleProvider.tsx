// src/components/LocaleProvider.tsx
"use client";

import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

export default function LocaleProvider({
 children,
 messages,
 locale,
}: {
 children: ReactNode;
 messages: Record<string, string>;
 locale: string;
}) {
 return (
  <NextIntlClientProvider messages={messages} locale={locale}>
   {children}
  </NextIntlClientProvider>
 );
}
