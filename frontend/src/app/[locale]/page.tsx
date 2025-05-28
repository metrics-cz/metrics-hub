import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations();

  return (
    <main>
      <h1>{t('welcome')}</h1>
      {/* other homepage content */}
    </main>
  );
}
