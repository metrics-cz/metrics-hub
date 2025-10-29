// src/components/BlockingScreen.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function BlockingScreen({ companyId }: { companyId: string }) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base p-6 ">
      <h1 className="text-2xl font-bold mb-4 text-primary">Unauthorized access</h1>

      <p className="text-lg text-secondary mb-6 text-secondary">
        You do not have permission to access this page.
      </p>

      {/* hard refresh of the current route */}
      <button
        onClick={() => router.refresh()}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 mb-4"
      >
        Try again
      </button>

      {/* fallback navigation in case access has changed */}
      <Link
        href={`/companies/`}
        className="text-blue-500 hover:underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
