// src/app/[locale]/layout.tsx
import LocaleProvider from "@/components/providers/LocaleProvider";
import type { ReactNode } from "react";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  let messages;
  const param = await params;
  const locale = param.locale;
  try {
    messages = (await import(`../../locales/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../locales/cz.json`)).default;
  }

  return (
      <LocaleProvider locale={locale} messages={messages}>
        {children}
      </LocaleProvider>
  );
}
