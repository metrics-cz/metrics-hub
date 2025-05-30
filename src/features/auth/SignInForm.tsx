'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const schema = z.object({
  email: z.string().email('Neplatný e-mail'),
  password: z.string().min(6, 'Min. 6 znaků'),
});
type FormData = z.infer<typeof schema>;

export default function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: 'onBlur' });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.replace('/');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">E-mail</label>
        <input
          type="email"
          {...register('email')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Heslo</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={loading}
        className="w-full bg-primary text-white rounded py-2 hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Přihlašuji…' : 'Přihlásit se'}
      </button>

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-500">nebo</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-50 transition"
      >
        <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
        <span className="text-sm font-medium text-gray-800">Přihlásit se pomocí Google</span>
      </button>
    </form>
  );
}
