'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
 const [showForgotPassword, setShowForgotPassword] = useState(false);
 const [resetEmailSent, setResetEmailSent] = useState(false);
 const [resetEmail, setResetEmail] = useState('');
 const router = useRouter();
 const params = useParams();
 const locale = params?.locale as string || 'en';

 const onSubmit = async (data: FormData) => {
  setLoading(true);
  setError(null);
  const { error } = await supabase.auth.signInWithPassword({
   email: data.email,
   password: data.password,
  });

  if (error) {
   setError(error instanceof Error ? error.message : 'Sign in failed');
  } else {
   router.replace('/');
  }

  setLoading(false);
 };

 const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
   provider: 'google',
   options: {
    redirectTo: `${window.location.origin}/${locale}/auth/callback`,
    skipBrowserRedirect: false,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
   },
  });

  if (error) {
   setError(error instanceof Error ? error.message : 'Sign in failed');
  }
 };

 const handleForgotPassword = async () => {
  if (!resetEmail || !resetEmail.includes('@')) {
   setError('Zadejte platný e-mail');
   return;
  }

  setLoading(true);
  setError(null);

  const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
   redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
  });

  if (error) {
   setError(error instanceof Error ? error.message : 'Sign in failed');
  } else {
   setResetEmailSent(true);
  }

  setLoading(false);
 };

 if (showForgotPassword) {
  return (
   <div className="space-y-4">
    <div className="text-center mb-4">
     <h3 className="text-lg font-semibold text-primary">Zapomenuté heslo</h3>
     <p className="text-sm text-muted mt-1">
      Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla.
     </p>
    </div>

    {resetEmailSent ? (
     <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
       <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-lg">✓</span>
       </div>
      </div>
      <div>
       <h4 className="font-semibold">E-mail byl odeslán</h4>
       <p className="text-sm text-secondary">
        Zkontrolujte svou e-mailovou schránku a klikněte na odkaz pro obnovení hesla.
       </p>
      </div>
      <button
       onClick={() => {
        setShowForgotPassword(false);
        setResetEmailSent(false);
        setResetEmail('');
       }}
       className="text-emerald-600 hover:text-emerald-700 underline"
      >
       Zpět na přihlášení
      </button>
     </div>
    ) : (
     <>
      <div>
       <label className="text-sm font-medium text-primary">E-mail</label>
       <input
        type="email"
        value={resetEmail}
        onChange={(e) => setResetEmail(e.target.value)}
        className="mt-1 w-full form-input px-3 py-2 bg-input border text-primary"
        placeholder="uzivatel@example.com"
       />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
       <button
        type="button"
        onClick={() => setShowForgotPassword(false)}
        className="flex-1 border py-2 rounded hover:bg-hover bg-card text-primary"
       >
        Zrušit
       </button>
       <button
        type="button"
        onClick={handleForgotPassword}
        disabled={loading || !resetEmail}
        className="flex-1 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
       >
        {loading ? 'Odesílám...' : 'Odeslat odkaz'}
       </button>
      </div>
     </>
    )}
   </div>
  );
 }

 return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
   <div>
    <label className="text-sm font-medium text-primary">E-mail</label>
    <input
     type="email"
     {...register('email')}
     className="mt-1 w-full form-input px-3 py-2 bg-input border text-primary"
    />
    {errors.email && (
     <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
    )}
   </div>

   <div>
    <div className="flex justify-between items-center">
     <label className="text-sm font-medium text-primary">Heslo</label>
     <button
      type="button"
      onClick={() => setShowForgotPassword(true)}
      className="text-sm text-emerald-600 hover:text-emerald-700 underline"
     >
      Zapoměli jste heslo?
     </button>
    </div>
    <input
     type="password"
     {...register('password')}
     className="mt-1 w-full form-input px-3 py-2 bg-input border text-primary"
    />
    {errors.password && (
     <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
    )}
   </div>

   {error && <p className="text-sm text-red-600">{error}</p>}

   <button
    disabled={loading}
    className="w-full bg-emerald-600 text-white rounded py-2 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
   >
    {loading ? 'Přihlašuji…' : 'Přihlásit se'}
   </button>

   <div className="flex items-center gap-2 my-4">
    <div className="flex-1 h-px bg-border-light" />
    <span className="text-sm text-muted">nebo</span>
    <div className="flex-1 h-px bg-border-light" />
   </div>

   <button
    type="button"
    onClick={handleGoogleSignIn}
    className="w-full flex items-center justify-center gap-2 border py-2 rounded hover:bg-hover transition bg-card"
   >
    <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
    <span className="text-sm font-medium text-secondary">Přihlásit se pomocí Google</span>
   </button>
  </form>
 );
}
