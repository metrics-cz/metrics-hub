'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "classnames";
import { useTranslations } from "next-intl";
import Avatar from '@/components/user/Avatar'

/* ---------------- schema & types ---------------- */
export default function ProfilePage() {
 const t = useTranslations("profile");
 const router = useRouter();
 const { user } = useAuth();

 // Redirect if not signed in
 useEffect(() => {
  if (!user) router.replace("/auth");
 }, [user, router]);

 // Validation schemas with i18n messages
 const nameSchema = z.object({
  firstName: z.string().min(2, t("validation.min2chars")),
  lastName: z.string().min(2, t("validation.min2chars")),
 });

 const emailSchema = z.object({
  email: z.string().email(t("validation.invalidEmail")),
  password: z.string().min(6, t("validation.passwordMin6")),
 });

 const pwdSchema = z.object({
  current: z.string().min(6, t("validation.passwordMin6")),
  password: z.string().min(6, t("validation.passwordMin6")),
 });

 type NameForm = z.infer<typeof nameSchema>;
 type EmailForm = z.infer<typeof emailSchema>;
 type PwdForm = z.infer<typeof pwdSchema>;

 /* --- name form --- */
 const {
  register: regName,
  handleSubmit: subName,
  formState: { errors: nameErr, isSubmitting: savingName },
  reset: resetName,
 } = useForm<NameForm>({
  resolver: zodResolver(nameSchema),
  defaultValues: {
   firstName: user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : "",
   lastName: user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").slice(1).join(" ")
    : "",
  },
 });

 const saveName = async (data: NameForm) => {
  if (!user) return;

  const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`;
  const { error: updateError } = await supabase.auth.updateUser({
   data: { full_name: displayName },
  });

  if (updateError) {
   alert(updateError.message);
   return;
  }

  // Update user metadata via API
  await fetch('/api/user/profile', {
   method: 'PATCH',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ full_name: displayName }),
  });

  resetName(data);
 };

 /* --- email form --- */
 const {
  register: regEmail,
  handleSubmit: subEmail,
  formState: { errors: emailErr, isSubmitting: savingEmail },
  reset: resetEmail,
 } = useForm<EmailForm>({
  resolver: zodResolver(emailSchema),
  defaultValues: { email: user?.email ?? "", password: "" },
 });

 const saveEmail = async (data: EmailForm) => {
  if (!user || !user.email) return;

  try {
   // Supabase doesn't support re-authenticate, so you may need to sign in again or require current password differently
   const { error } = await supabase.auth.updateUser({
    email: data.email,
    password: data.password,
   });

   if (error) {
    alert(error instanceof Error ? error.message : "Unknown error");
    return;
   }

   await fetch('/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: data.email }),
   });
   resetEmail({ ...data, password: "" });
  } catch (err) {
   alert("Chyba při aktualizaci e-mailu");
  }
 };

 /* --- password form --- */
 const {
  register: regPwd,
  handleSubmit: subPwd,
  formState: { errors: pwdErr, isSubmitting: savingPwd },
  reset: resetPwd,
 } = useForm<PwdForm>({
  resolver: zodResolver(pwdSchema),
 });

 const savePwd = async (data: PwdForm) => {
  if (!user) return;

  try {
   // Supabase allows updating password directly
   const { error } = await supabase.auth.updateUser({
    password: data.password,
   });

   if (error) {
    alert(error instanceof Error ? error.message : "Unknown error");
    return;
   }

   resetPwd({ current: "", password: "" });
  } catch (err) {
   alert("Chyba při změně hesla");
  }
 };

 /* --- avatar upload --- */
 const handleRemoveAvatar = async () => {
  if (!user) return;

  try {
   // Remove avatar via API
   const response = await fetch('/api/user/avatar', {
    method: 'DELETE',
   });

   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to remove avatar');
   }
   
   // Clear avatar_url in the auth profile
   const { error: upErr } = await supabase.auth.updateUser({
    data: { avatar_url: null },
   });
   if (upErr) throw upErr;

  } catch (err) {
   console.error('remove avatar failed:', err);
   alert(t('removeFailed'));      // add i18n string
  }
 };

 const confirmAndRemove = () => {
  const sure = confirm(t('removeConfirm')); // e.g. "Are you sure?"
  if (sure) handleRemoveAvatar();
 };
 const [uploading, setUploading] = useState(false);

 const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!user || !e.target.files?.[0]) return;
  setUploading(true);

  try {
   const file = e.target.files[0];
   const formData = new FormData();
   formData.append('file', file);

   // Upload via API
   const response = await fetch('/api/user/avatar', {
    method: 'POST',
    body: formData,
   });

   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload avatar');
   }

   const { avatar_url } = await response.json();

   // Update auth profile
   const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url },
   });

   if (updateError) throw updateError;
  } catch (err) {
   console.error("Upload avatar failed:", err);
   alert(t("uploadFailed"));
  } finally {
   setUploading(false);
  }
 };

 /* --- delete account --- */
 const handleDelete = async () => {
  if (!user) return;
  if (!confirm(t("deleteConfirm"))) return;

  try {
   const res = await fetch("/api/deleteUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id }),
   });
   if (!res.ok) {
    const data = await res.json();
    alert(data.error || "Chyba při mazání účtu");
    return;
   }

   router.replace("/auth");
  } catch {
   alert("Chyba při mazání účtu");
  }
 };

 return (
  <div className="p-10 max-w-3xl mx-auto space-y-12 text-primary">
   {/* avatar + basic */}
   <section className="space-y-6">
    <h2 className="text-xl font-semibold">{t('title')}</h2>

    <div className="flex items-center gap-6">
     {/* clickable avatar / placeholder */}
     <label className="relative cursor-pointer">
      <Avatar
       src={user?.user_metadata?.avatar_url ?? null}
       name={user?.user_metadata?.full_name ?? ''}
       size={112}    /* 112 px == w-28 h-28 */
       className="ring-2 ring-primary/50"
      />

      <input
       type="file"
       accept="image/*"
       className="absolute inset-0 opacity-0 cursor-pointer"
       onChange={handleAvatar}
       disabled={uploading}
      />


     </label>

     <div className="text-sm text-muted">
      <p>{t('uploadPhoto')}</p>
      {user?.user_metadata?.avatar_url && (
       <p
        onClick={confirmAndRemove}
        className="text-red-500 text-badge-error-text cursor-pointer hover:underline"
       >
        {t('removePhoto')}
       </p>
      )}
      {uploading && <p className="text-accent">{t('uploading')}</p>}
     </div>
    </div>
   </section>


   {/* name */}
   <section className="space-y-4">
    <h3 className="font-medium">{t("name")}</h3>
    <form onSubmit={subName(saveName)} className="grid grid-cols-2 gap-4 max-w-lg">
     <div>
      <input
       {...regName("firstName")}
       placeholder={t("firstNamePlaceholder")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", nameErr.firstName && "ring-2 ring-red-400")}
      />
      {nameErr.firstName && <p className="text-xs text-red-600">{nameErr.firstName.message}</p>}
     </div>
     <div>
      <input
       {...regName("lastName")}
       placeholder={t("lastNamePlaceholder")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", nameErr.lastName && "ring-2 ring-red-400")}
      />
      {nameErr.lastName && <p className="text-xs text-red-600">{nameErr.lastName.message}</p>}
     </div>
     <button
      type="submit"
      disabled={savingName}
      className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 disabled:opacity-50 transition-colors"
     >
      {t("saveChanges")}
     </button>
    </form>
   </section>

   {/* email */}
   <section className="space-y-4">
    <h3 className="font-medium">{t("email")}</h3>
    <form onSubmit={subEmail(saveEmail)} className="grid gap-4 max-w-lg">
     <div>
      <label className="block text-sm mb-1">{t("newEmail")}</label>
      <input
       {...regEmail("email")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", emailErr.email && "ring-2 ring-red-400")}
      />
      {emailErr.email && <p className="text-xs text-red-600">{emailErr.email.message}</p>}
     </div>
     <div>
      <label className="block text-sm mb-1">{t("passwordConfirm")}</label>
      <input
       type="password"
       {...regEmail("password")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", emailErr.password && "ring-2 ring-red-600")}
      />
      {emailErr.password && <p className="text-xs text-red-600">{emailErr.password.message}</p>}
     </div>
     <button
      type="submit"
      disabled={savingEmail}
      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 disabled:opacity-50 transition-colors"
     >
      {t("updateEmail")}
     </button>
    </form>
   </section>

   {/* password */}
   <section className="space-y-4">
    <h3 className="font-medium">{t("changePassword")}</h3>
    <form onSubmit={subPwd(savePwd)} className="grid gap-4 max-w-lg">
     <div>
      <label className="block text-sm mb-1">{t("currentPassword")}</label>
      <input
       type="password"
       {...regPwd("current")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", pwdErr.current && "ring-2 ring-red-400")}
      />
      {pwdErr.current && <p className="text-xs text-red-600">{pwdErr.current.message}</p>}
     </div>
     <div>
      <label className="block text-sm mb-1">{t("newPassword")}</label>
      <input
       type="password"
       {...regPwd("password")}
       className={clsx("w-full form-input bg-input border-border-default text-primary", pwdErr.password && "ring-2 ring-red-400")}
      />
      {pwdErr.password && <p className="text-xs text-red-600">{pwdErr.password.message}</p>}
     </div>
     <button
      type="submit"
      disabled={savingPwd}
      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 disabled:opacity-50 transition-colors"
     >
      {t("changePasswordButton")}
     </button>
    </form>
   </section>

   {/* danger zone */}
   <section className="space-y-4">
    <h3 className="font-medium text-error">{t("dangerZone")}</h3>
    <button
     onClick={handleDelete}
     className="bg-red-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-red-700 transition-colors"
    >
     {t("deleteAccount")}
    </button>
   </section>
  </div>
 );
}
