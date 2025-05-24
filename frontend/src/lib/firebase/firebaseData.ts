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
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('companies', 'array-contains', companyId));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map((doc) => {
      const rawData = { id: doc.id, ...doc.data() };
      const parsed = userSchema.safeParse(rawData);
      if (!parsed.success) {
        console.warn('Invalid user data:', parsed.error);
        return null;
      }
      return parsed.data;
    });

    return users.filter(Boolean); // Remove nulls
  } catch (error) {
    console.error('Error fetching users by company:', error);
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
