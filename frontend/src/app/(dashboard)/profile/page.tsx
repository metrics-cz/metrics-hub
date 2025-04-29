"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
} from "@/lib/firebaseClient";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { getClientStorage } from "@/lib/firebaseClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "classnames";

/* ---------------- schema & types ---------------- */
const nameSchema = z.object({
  firstName: z.string().min(2, "Min. 2 znaky"),
  lastName: z.string().min(2, "Min. 2 znaky"),
});

type NameForm = z.infer<typeof nameSchema>;

const emailSchema = z.object({
  email: z.string().email("Neplatný e‑mail"),
  password: z.string().min(6, "Heslo pro potvrzení (min. 6 znaků)"),
});

type EmailForm = z.infer<typeof emailSchema>;

const pwdSchema = z.object({
  current: z.string().min(6, "Min. 6 znaků"),
  password: z.string().min(6, "Min. 6 znaků"),
});

type PwdForm = z.infer<typeof pwdSchema>;

/* ---------------- page component ---------------- */
export default function ProfilePage() {
  const user = auth.currentUser;
  const router = useRouter();

  /* redirect if somehow no user */
  useEffect(() => {
    if (!user) router.replace("/auth");
  }, [user, router]);

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
    resetName(data); // sync form state
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

    const storage = getClientStorage();
    if (!storage) return;          // SSR fallback

    setUploading(true);

    try {
      const file = e.target.files[0];
      const ref  = storageRef(storage, `avatars/${user.uid}`);
      await uploadBytes(ref, file);
      const url  = await getDownloadURL(ref);
  
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
    } catch (err) {
      console.error('Upload avatar failed:', err);
      alert('Nahrání fotky se nepovedlo.');
    } finally {
      setUploading(false);
    }
  };

  /* ------------ delete account ------------ */
  const handleDelete = async () => {
    if (!user) return;
    const ok = window.confirm("Opravdu smazat celý účet? Tento krok nelze vrátit.");
    if (!ok) return;
    await deleteUser(user);
    router.replace("/auth");
  };

  /* =================================================================== */
  return (
    <div className="p-10 max-w-3xl mx-auto space-y-12">
      {/* ---------------- avatar + basic ---------------- */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Profil</h2>

        <div className="flex items-center gap-6">
          <label className="relative cursor-pointer">
            <img
              src={user?.photoURL ?? "/avatar.svg"}
              alt="avatar"
              className="w-28 h-28 rounded-full object-cover ring-2 ring-primary/50"
            />
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleAvatar}
              disabled={uploading}
            />
          </label>
          <div className="text-sm text-neutral-500">
            <p>Kliknutím nahrajte novou fotku.</p>
            {uploading && <p className="text-primary">Nahrávám…</p>}
          </div>
        </div>
      </section>

      {/* ---------------- jméno ---------------- */}
      <section className="space-y-4">
        <h3 className="font-medium">Jméno a příjmení</h3>
        <form onSubmit={subName(saveName)} className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <input
              {...regName("firstName")}
              placeholder="Jméno"
              className={clsx("w-full form-input", nameErr.firstName && "ring-2 ring-red-400")}
            />
            {nameErr.firstName && <p className="text-xs text-red-600">{nameErr.firstName.message}</p>}
          </div>
          <div>
            <input
              {...regName("lastName")}
              placeholder="Příjmení"
              className={clsx("w-full form-input", nameErr.lastName && "ring-2 ring-red-400")}
            />
            {nameErr.lastName && <p className="text-xs text-red-600">{nameErr.lastName.message}</p>}
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="col-span-2 bg-primary text-white rounded py-2 disabled:opacity-50"
          >
            Uložit změny
          </button>
        </form>
      </section>

      {/* ---------------- email ---------------- */}
      <section className="space-y-4">
        <h3 className="font-medium">E‑mail</h3>
        <form onSubmit={subEmail(saveEmail)} className="grid gap-4 max-w-lg">
          <div>
            <label className="block text-sm mb-1">Nový e‑mail</label>
            <input
              {...regEmail("email")}
              className={clsx("w-full form-input", emailErr.email && "ring-2 ring-red-400")}
            />
            {emailErr.email && <p className="text-xs text-red-600">{emailErr.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Heslo pro potvrzení</label>
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
            className="bg-primary text-white rounded py-2 disabled:opacity-50"
          >
            Aktualizovat e‑mail
          </button>
        </form>
      </section>

      {/* ---------------- password ---------------- */}
      <section className="space-y-4">
        <h3 className="font-medium">Změna hesla</h3>
        <form onSubmit={subPwd(savePwd)} className="grid gap-4 max-w-lg">
          <div>
            <label className="block text-sm mb-1">Aktuální heslo</label>
            <input
              type="password"
              {...regPwd("current")}
              className={clsx("w-full form-input", pwdErr.current && "ring-2 ring-red-400")}
            />
            {pwdErr.current && <p className="text-xs text-red-600">{pwdErr.current.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Nové heslo</label>
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
            className="bg-primary text-white rounded py-2 disabled:opacity-50"
          >
            Změnit heslo
          </button>
        </form>
      </section>

      {/* ---------------- danger zone ---------------- */}
      <section className="space-y-4">
        <h3 className="font-medium text-red-600">Nebezpečná zóna</h3>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded shadow-md hover:bg-red-700"
        >
          Smazat účet
        </button>
      </section>
    </div>
  );
}
