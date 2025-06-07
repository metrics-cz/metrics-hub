'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cacheGoogleAvatar } from '@/lib/uploadGoogleAvatar';

type AuthContextValue = {
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /* -------------------------------------------------------------------- */
  /* Local state                                                          */
  /* -------------------------------------------------------------------- */
  const [user, setUser]     = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------------------- */
  /* 1.  Initial session load                                             */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });
  }, []);

  /* -------------------------------------------------------------------- */
  /* 2.  Listen for auth state changes                                    */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      /* ––––––––––––––– Google-avatar cache (runs only once) ––––––––––– */
      if (
        newUser &&
        newUser.user_metadata?.provider === 'google' &&
        newUser.user_metadata?.avatar_url &&
        !newUser.user_metadata?.cached_avatar
      ) {
        try {
          const cached = await cacheGoogleAvatar(
            newUser.id,
            newUser.user_metadata.avatar_url
          );

          /* A)  store in auth metadata  */
          await supabase.auth.updateUser({
            data: { cached_avatar: cached },
          });

          /* B)  optional public table   */
          await supabase
            .from('users')
            .update({ avatar_url: cached })
            .eq('id', newUser.id);

          /* C)  reflect immediately in local state so UI updates now     */
          setUser((prev) =>
            prev ? { ...prev, user_metadata: { ...prev.user_metadata, cached_avatar: cached } } : prev
          );
        } catch (err) {
          console.error('avatar cache failed', err);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* -------------------------------------------------------------------- */
  /* Provider                                                             */
  /* -------------------------------------------------------------------- */
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/* Simple hook ---------------------------------------------------------- */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
