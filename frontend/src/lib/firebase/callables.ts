"use client";

import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { fnc } from "./firebaseClient";

export const callCreateCompany = async (params: {
  name: string;
  billingEmail?: string;
}) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be signed in to create a company.");
  }

  // Optional: force refresh ID token (useful for edge cases)
  await user.getIdToken(true);

  const fn = httpsCallable(fnc, "createCompany");
  const res = await fn(params);
  return res.data as { companyId: string };
};
