"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/firebaseClient";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientStorage } from "@/lib/firebase/firebaseClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "classnames";
import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";  // Assuming react-i18next

/* ---------------- schema & types ---------------- */
export default function ProfilePage() {
  const t = useTranslations('profile');

  const user = auth.currentUser;
  const router = useRouter();

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

  /* ------------ name form ------------ */
  const {
    register: regName,
    handleSubmit: subName,
    formState: { errors: nameErr, isSubmitting: savingName },
    reset: resetName,
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      firstName: user?.displayName?.split(" ")[0] ?? "",
      lastName: user?.displayName?.split(" ").slice(1).join(" ") ?? "",
    },
  });

  const saveName = async (data: NameForm) => {
    if (!user) return;
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    await updateProfile(user, { displayName });
    await updateDoc(doc(db, "users", user.uid), { displayName });
    resetName(data);
  };

  /* ------------ email form ------------ */
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
    const cred = EmailAuthProvider.credential(user.email, data.password);
    await reauthenticateWithCredential(user, cred);
    await updateEmail(user, data.email);
    await updateDoc(doc(db, "users", user.uid), { email: data.email });
    resetEmail({ ...data, password: "" });
  };

  /* ------------ password form ------------ */
  const {
    register: regPwd,
    handleSubmit: subPwd,
    formState: { errors: pwdErr, isSubmitting: savingPwd },
    reset: resetPwd,
  } = useForm<PwdForm>({
    resolver: zodResolver(pwdSchema),
  });

  const savePwd = async (data: PwdForm) => {
    if (!user || !user.email) return;
    const cred = EmailAuthProvider.credential(user.email, data.current);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, data.password);
    resetPwd({ current: "", password: "" });
  };

  /* ------------ avatar upload ------------ */
  const [uploading, setUploading] = useState(false);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setUploading(true);

    const storage = getClientStorage();https://next-intl.dev/docs/getting-started/app-router
    if (!storage) return;

    try {
      const file = e.target.files[0];
      const ref = storageRef(storage, `avatars/${user.uid}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);

      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
    } catch (err) {
      console.error("Upload avatar failed:", err);
      alert(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  /* ------------ delete account ------------ */
  const handleDelete = async () => {
    if (!user) return;
    const ok = window.confirm(t("deleteConfirm"));
    if (!ok) return;
    await deleteUser(user);
    router.replace("/auth");
  };

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-12">
      {/* avatar + basic */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">{t("title")}</h2>

        <div className="flex items-center gap-6">
          <label className="relative cursor-pointer">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                className="w-28 h-28 rounded-full object-cover ring-2 ring-primary/50"
                alt="avatar"
              />
            ) : (
              <div className="w-28 h-28 flex justify-center items-center bg-gray-400 rounded-full">
                <FilePlus2 size={48} color="white" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleAvatar}
              disabled={uploading}
            />
          </label>
          <div className="text-sm text-neutral-500">
            <p>{t("uploadPhoto")}</p>
            {uploading && <p className="text-primary">{t("uploading")}</p>}
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
              className={clsx("w-full form-input", nameErr.firstName && "ring-2 ring-red-400")}
            />
            {nameErr.firstName && <p className="text-xs text-red-600">{nameErr.firstName.message}</p>}
          </div>
          <div>
            <input
              {...regName("lastName")}
              placeholder={t("lastNamePlaceholder")}
              className={clsx("w-full form-input", nameErr.lastName && "ring-2 ring-red-400")}
            />
            {nameErr.lastName && <p className="text-xs text-red-600">{nameErr.lastName.message}</p>}
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="col-span-2 bg-primary text-white rounded-md py-2 disabled:opacity-50"
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
              className={clsx("w-full form-input", emailErr.email && "ring-2 ring-red-400")}
            />
            {emailErr.email && <p className="text-xs text-red-600">{emailErr.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">{t("passwordConfirm")}</label>
            <input
              type="password"
              {...regEmail("password")}
              className={clsx("w-full form-input", emailErr.password && "ring-2 ring-red-400")}
            />
            {emailErr.password && <p className="text-xs text-red-600">{emailErr.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={savingEmail}
            className="bg-primary text-white rounded-md py-2 disabled:opacity-50"
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
              className={clsx("w-full form-input", pwdErr.current && "ring-2 ring-red-400")}
            />
            {pwdErr.current && <p className="text-xs text-red-600">{pwdErr.current.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">{t("newPassword")}</label>
            <input
              type="password"
              {...regPwd("password")}
              className={clsx("w-full form-input", pwdErr.password && "ring-2 ring-red-400")}
            />
            {pwdErr.password && <p className="text-xs text-red-600">{pwdErr.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={savingPwd}
            className="bg-primary text-white rounded-md py-2 disabled:opacity-50"
          >
            {t("changePasswordButton")}
          </button>
        </form>
      </section>

      {/* danger zone */}
      <section className="space-y-4">
        <h3 className="font-medium text-red-600">{t("dangerZone")}</h3>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-red-700"
        >
          {t("deleteAccount")}
        </button>
      </section>
    </div>
  );
}
