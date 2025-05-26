import { auth as firebaseAuth } from '@/lib/firebase/firebaseClient';

export default async function deleteUser(userId: string, companyId: string): Promise<void> {
  try {
    const token = await firebaseAuth.currentUser?.getIdToken();

    const response = await fetch(`/api/company/${companyId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error deleting user: ${response.statusText}`);
    }

    // Optionally, you can return a success message or perform additional actions
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error; // Re-throw the error for further handling if needed
  }
}