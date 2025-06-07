import { createClient } from '@supabase/supabase-js';

/**
 * Downloads a remote Google avatar once and re-uploads it to
 * your public `avatars` bucket. Returns the public URL.
 *
 * Will overwrite the file if it already exists (upsert = true).
 */
export async function cacheGoogleAvatar(
  userId: string,
  googleUrl: string
): Promise<string> {
  // local Supabase client – *browser* keys are enough here
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /* 1) download the original image ------------------------------------- */
  const res = await fetch(googleUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot fetch Google avatar');

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const blob        = await res.blob();                   // works in Node 18+
  const ext         = contentType.split('/')[1] ?? 'jpg';

  /* 2) upload to Storage ------------------------------------------------ */
  const path = `${userId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  /* 3) return its public URL ------------------------------------------- */
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
