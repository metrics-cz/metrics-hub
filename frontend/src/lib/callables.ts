'use client';

import { httpsCallable } from 'firebase/functions';
import { fnc } from './firebaseClient';

/** callable: createCompany – vrací { companyId } */
export const callCreateCompany = async (params: {
  name: string;
  billingEmail?: string;
}) => {
  const fn = httpsCallable(fnc, 'createCompany');
  const res = await fn(params);
  return res.data as { companyId: string };
};
