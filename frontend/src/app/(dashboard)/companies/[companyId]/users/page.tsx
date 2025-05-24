import UserTable from '@/components/user/UserTable';
import { fetchUsersByCompany } from '@/lib/firebase/firebaseData'; // or however you fetch
import { User } from '@/lib/validation/userSchema';

export default async function UsersPage(props: { params: { companyId: string } }) {
  const { companyId } = props.params;
  const users: User[] = await fetchUsersByCompany(companyId); // Replace with real fetch logic

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Uživatelé</h1>
      <UserTable users={users} />
    </div>
  );
}
