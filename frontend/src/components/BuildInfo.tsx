// src/components/BuildInfo.tsx
'use client';

export default function BuildInfo() {
  return (
    <span className="text-xs text-neutral-400">
      build&nbsp;
      {process.env.NEXT_PUBLIC_APP_VERSION?.substring(0, 7) ?? 'dev'}
    </span>
  );
}
