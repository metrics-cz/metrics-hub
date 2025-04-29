'use client';

import { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { motion } from 'framer-motion';
import clsx from 'classnames';

/* ----------------------------- validátor ------------------------------ */
const pwdRegexUpper   = /[A-Z]/;
const pwdRegexNumber  = /[0-9]/;
const pwdRegexSpecial = /[!-/:-@[-`{-~_]/; // includes _

const schema = z
  .object({
    firstName: z.string().min(2, 'Min. 2 znaky'),
    lastName:  z.string().min(2, 'Min. 2 znaky'),
    email:     z.string().email('Neplatný e-mail'),
    password:  z
      .string()
      .min(8, 'Min. 8 znaků')
      .refine((v) => pwdRegexUpper.test(v),   { message: 'Alespoň 1 velké písmeno' })
      .refine((v) => pwdRegexNumber.test(v),  { message: 'Alespoň 1 číslice' })
      .refine((v) => pwdRegexSpecial.test(v), { message: 'Alespoň 1 speciální znak' }),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    message: 'Hesla se neshodují',
    path: ['password2'],
  });

type FormData = z.infer<typeof schema>;

/* ----------------------------- komponenta ----------------------------- */
export default function SignUpForm({
  switchToLogin,
}: {
  switchToLogin: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const [ok, setOk] = useState(false);

  /* --- indikátor síly hesla ------------------------------------------------ */
  const pwd = watch('password') ?? '';
  const pwdScore = useMemo(() => {
    let score = 0;
    if (pwdRegexUpper.test(pwd)) score++;
    if (pwdRegexNumber.test(pwd)) score++;
    if (pwdRegexSpecial.test(pwd)) score++;
    if (pwd.length >= 8) score++;
    return score; // 0–4
  }, [pwd]);

  /* --- submit -------------------------------------------------------------- */
  const onSubmit = async (data: FormData) => {
    // 1) ověříme, jestli e-mail už není registrován
    const methods = await fetchSignInMethodsForEmail(auth, data.email);
    if (methods.length) {
      setError('email', { message: 'E-mail už existuje' });
      return;
    }

    // 2) vytvoříme uživatele
    const cred = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // 3) uložíme jméno + příjmení do profilu
    await updateProfile(cred.user, {
      displayName: `${data.firstName} ${data.lastName}`.trim(),
    });

    setOk(true);
  };

  /* --- hotový účet -------------------------------------------------------- */
  if (ok)
    return (
      <div className="text-center space-y-4">
        <p className="text-primary font-medium">
          Účet byl vytvořen. Na zadaný e-mail jsme odeslali ověřovací zprávu.
        </p>
        <button
          onClick={switchToLogin}
          className="underline text-sm text-primary hover:text-primary/80"
        >
          Pokračovat na přihlášení
        </button>
      </div>
    );

  /* --- formulář ------------------------------------------------------------ */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Jméno + Příjmení --------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Jméno</label>
          <input
            {...register('firstName')}
            className="mt-1 w-full form-input px-3 py-2"
          />
          {errors.firstName && (
            <p className="text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Příjmení</label>
          <input
            {...register('lastName')}
            className="mt-1 w-full form-input px-3 py-2"
          />
          {errors.lastName && (
            <p className="text-xs text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* E-mail ------------------------------------------------------------- */}
      <div>
        <label className="text-sm font-medium">E-mail</label>
        <input
          type="email"
          {...register('email')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Heslo + Potvrzení --------------------------------------------------- */}
      <div>
        <label className="text-sm font-medium">Heslo</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {/* Strength bar */}
        <motion.div
          className={clsx(
            'h-2 rounded mt-2 transition-colors',
            [
              'bg-red-400',
              'bg-orange-400',
              'bg-yellow-400',
              'bg-green-400',
              'bg-emerald-500',
            ][pwdScore]
          )}
          style={{ width: `${(pwdScore / 4) * 100}%` }}
        />
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Potvrzení hesla</label>
        <input
          type="password"
          {...register('password2')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {errors.password2 && (
          <p className="text-xs text-red-600">{errors.password2.message}</p>
        )}
      </div>

      {/* Submit ------------------------------------------------------------- */}
      <button
        disabled={isSubmitting}
        className="w-full bg-primary text-white rounded py-2 hover:bg-primary/90 disabled:opacity-50"
      >
        Registrovat se
      </button>
    </form>
  );
}
