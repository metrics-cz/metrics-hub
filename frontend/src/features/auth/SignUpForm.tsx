// features/auth/SignUpForm.tsx
'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Neplatný e-mail'),
  password: z.string().min(6, 'Min. 6 znaků'),
  password2: z.string(),
}).refine((d) => d.password === d.password2, {
  message: 'Hesla se neshodují',
  path: ['password2'],
});
type FormData = z.infer<typeof schema>;

export default function SignUpForm({ switchToLogin }: { switchToLogin: () => void }) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      setOk(true);          // účet vytvořen
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (ok)
    return (
      <div className="text-center space-y-4">
        <p className="text-primary font-medium">
          Účet byl vytvořen. Na zadaný e-mail byl odeslán ověřovací e-mail.
        </p>
        <button
          onClick={switchToLogin}
          className="underline text-sm text-primary hover:text-primary/80"
        >
          Pokračovat na přihlášení
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">E-mail</label>
        <input
          type="email"
          {...register('email')}
          className="mt-1 w-full rounded border px-3 py-2"
        />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Heslo</label>
          <input
            type="password"
            {...register('password')}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Potvrzení</label>
          <input
            type="password"
            {...register('password2')}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
      </div>
      {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      {errors.password2 && <p className="text-xs text-red-600">{errors.password2.message}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        className="w-full bg-primary text-white rounded py-2 hover:bg-primary/90"
      >
        Registrovat se
      </button>
    </form>
  );
}
