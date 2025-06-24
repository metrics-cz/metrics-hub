'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import clsx from 'classnames';
import { supabase } from '@/lib/supabaseClient';

const pwdRegexUpper = /[A-Z]/;
const pwdRegexNumber = /[0-9]/;
const pwdRegexSpecial = /[!-/:-@[-`{-~_]/;

const schema = z
  .object({
    firstName: z.string().min(2, 'Min. 2 znaky'),
    lastName: z.string().min(2, 'Min. 2 znaky'),
    email: z.string().email('Neplatný e-mail'),
    password: z
      .string()
      .min(8, 'Min. 8 znaků')
      .refine((v) => pwdRegexUpper.test(v), { message: 'Alespoň 1 velké písmeno' })
      .refine((v) => pwdRegexNumber.test(v), { message: 'Alespoň 1 číslice' })
      .refine((v) => pwdRegexSpecial.test(v), { message: 'Alespoň 1 speciální znak' }),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    message: 'Hesla se neshodují',
    path: ['password2'],
  });

type FormData = z.infer<typeof schema>;

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
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const [ok, setOk] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const pwd = watch('password') ?? '';
  const email = watch('email') ?? '';

  const pwdScore = useMemo(() => {
    let score = 0;
    if (pwdRegexUpper.test(pwd)) score++;
    if (pwdRegexNumber.test(pwd)) score++;
    if (pwdRegexSpecial.test(pwd)) score++;
    if (pwd.length >= 8) score++;
    return score;
  }, [pwd]);

  // Debounced email existence check
  const checkEmailExists = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setEmailExists(null);
      return;
    }

    setEmailChecking(true);
    setEmailExists(null);

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      });

      if (response.ok) {
        const { exists } = await response.json();
        setEmailExists(exists);
        if (exists) {
          setError('email', { message: 'E-mail už existuje' });
        } else {
          clearErrors('email');
        }
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setEmailChecking(false);
    }
  }, [setError, clearErrors]);

  // Watch email changes and debounce the check
  React.useEffect(() => {
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    if (email && email.includes('@')) {
      emailCheckTimeoutRef.current = setTimeout(() => {
        checkEmailExists(email);
      }, 800); // 800ms debounce
    } else {
      setEmailExists(null);
      setEmailChecking(false);
    }

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email, checkEmailExists]);

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: `${data.firstName} ${data.lastName}`,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('email', { message: 'E-mail už existuje' });
      } else {
        setError('email', { message: error.message });
      }
      return;
    }

    setOk(true);
  };

  if (ok)
    return (
      <div className="text-center space-y-6 py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">✓</span>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Děkujeme za registraci!
          </h3>
          <p className="text-gray-600">
            Na Váš e-mail jsme zaslali odkaz pro potvrzení účtu.
          </p>
        </div>
        <button
          onClick={switchToLogin}
          className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition-colors"
        >
          Pokračovat na přihlášení
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Jméno</label>
          <input {...register('firstName')} className="mt-1 w-full form-input px-3 py-2" />
          {errors.firstName && (
            <p className="text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Příjmení</label>
          <input {...register('lastName')} className="mt-1 w-full form-input px-3 py-2" />
          {errors.lastName && (
            <p className="text-xs text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">E-mail</label>
        <div className="relative">
          <input
            type="email"
            {...register('email')}
            className="mt-1 w-full form-input px-3 py-2 pr-10"
          />
          {emailChecking && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {emailExists === false && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          )}
          {emailExists === true && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✗</span>
              </div>
            </div>
          )}
        </div>
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Heslo</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        
        {/* Password strength indicator */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Síla hesla:</span>
            <motion.div
              className={clsx(
                'h-2 rounded flex-1 transition-colors',
                ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'][pwdScore]
              )}
              style={{ width: `${(pwdScore / 4) * 100}%` }}
            />
          </div>
          
          {/* Password requirements checklist */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className={clsx(
                'w-4 h-4 rounded-sm flex items-center justify-center',
                pwd.length >= 8 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              )}>
                {pwd.length >= 8 && '✓'}
              </div>
              <span className={pwd.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                Alespoň 8 znaků
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={clsx(
                'w-4 h-4 rounded-sm flex items-center justify-center',
                pwdRegexUpper.test(pwd) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              )}>
                {pwdRegexUpper.test(pwd) && '✓'}
              </div>
              <span className={pwdRegexUpper.test(pwd) ? 'text-green-600' : 'text-gray-500'}>
                Alespoň jedno velké písmeno
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={clsx(
                'w-4 h-4 rounded-sm flex items-center justify-center',
                pwdRegexNumber.test(pwd) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              )}>
                {pwdRegexNumber.test(pwd) && '✓'}
              </div>
              <span className={pwdRegexNumber.test(pwd) ? 'text-green-600' : 'text-gray-500'}>
                Alespoň jedno číslo
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={clsx(
                'w-4 h-4 rounded-sm flex items-center justify-center',
                pwdRegexSpecial.test(pwd) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              )}>
                {pwdRegexSpecial.test(pwd) && '✓'}
              </div>
              <span className={pwdRegexSpecial.test(pwd) ? 'text-green-600' : 'text-gray-500'}>
                Alespoň jeden speciální znak
              </span>
            </div>
          </div>
        </div>
        
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Potvrzení hesla</label>
        <input
          type="password"
          {...register('password2')}
          className="mt-1 w-full form-input px-3 py-2"
        />
        {errors.password2 && (
          <p className="text-xs text-red-600">{errors.password2.message}</p>
        )}
      </div>

      <button
        disabled={isSubmitting || emailExists === true}
        className="w-full bg-primary-600 text-white rounded py-2 hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Vytvářím účet...' : 'Vytvořit účet'}
      </button>
    </form>
  );
}
