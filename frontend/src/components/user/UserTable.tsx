'use client';

import { User } from '@/lib/validation/firebaseSchemas';
import UserRow from './UserRow';

type Props = {
  users: User[];
};

export default function UserTable({ users }: Props) {

  console.log("Users data:", users);
  return (
    <table className="w-full text-left border-separate border-spacing-y-2">
      <thead className="text-sm text-gray-500 border-b border-gray-400">
        <tr>
          <th className="px-4 py-2">Uživatel</th>
          <th className="px-4 py-2">Role</th>
          <th className="px-4 py-2">Poslední přihlášení</th>
          <th className="px-4 py-2">Stav</th>
          <th></th>
        </tr>
      </thead>
      <tbody className="text-sm bg-white">
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </tbody>
    </table>
  );
}
