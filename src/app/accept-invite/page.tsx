import { Suspense } from 'react';
import AcceptInviteClient from './AcceptInvite.client';

export const dynamic = 'force-dynamic';  // this page is always rendered per-request

/**
 * Wrapper that provides a <Suspense> boundary so the
 * client-side router hooks are legal during prerendering.
 */
export default function Page() {
 return (
  <Suspense fallback={<main className="p-4 text-center">Loading…</main>}>
   <AcceptInviteClient />
  </Suspense>
 );
}
