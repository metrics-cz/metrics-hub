import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, auth as firebaseAuth } from './firebaseClient';
import { userSchema, companySchema } from '../validation/firebaseSchemas';

export async function fetchUsersByCompany(companyId: string) {
  try {
    const currentUser = firebaseAuth.currentUser;

    if (!currentUser) {
      throw new Error('User is not authenticated');
    }

    const idToken = await currentUser.getIdToken();

    const res = await fetch(`/api/company/${companyId}/users`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to fetch users');
    }

    const usersRaw = await res.json();

    // Optional validation
    const users = usersRaw.map((rawData: any) => {
      const parsed = userSchema.safeParse(rawData);
      if (!parsed.success) {
        console.warn('Invalid user data:', parsed.error);
        return null;
      }
      return parsed.data;
    });

    return users.filter(Boolean);
  } catch (error) {
    console.error('Error calling API:', error);
    return [];
  }
}

 export async function getCompanyById(companyId: string) {
  try {
    const currentUser = firebaseAuth.currentUser;

    if (!currentUser) {
      throw new Error('User is not authenticated');
    }

    const idToken = await currentUser.getIdToken();

    const res = await fetch(`/api/company/${companyId}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to fetch company');
    }

    return await res.json();
  } catch (error) {
    console.error('Error calling API:', error);
    return null;
  }
}
