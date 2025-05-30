'use client';

import { CompanyUserMini as User } from '@/lib/company/companyUserMini';
import { useState } from 'react';
import UserInitialsIcon from './UserInitialsIcon';
import { useParams, useRouter } from 'next/navigation';
import { deleteUser } from '@/lib/users/deleteUser';
type Props = {
  user: User;
};

export default function UserRow({ user }: Props) {
  const { companyId } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = window.location.pathname;
  return (
    <tr className="shadow-sm rounded-md">
      <td className="flex items-center gap-3 px-4 py-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <UserInitialsIcon name={user.fullName} />
        )}
        <div>
          <div className="font-medium text-gray-900">{user.fullName}</div>
        </div>
      </td>

      {/*   <td className="px-4 py-3">{user.role}</td> */}
      <td className="px-4 py-3">{user.role || '—'}</td>

      <td className='px-4 py-3'>{user.lastSignIn ? user.lastSignIn.toLocaleString("sk-SK") : '—'}</td>
      {<td className="px-4 py-3">
        {user.status === 'active' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Aktivní
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            Čeká na pozvánku
          </span>
        )}
      </td>}

      <td className="px-4 py-3 text-right relative">
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="absolute right-4 z-10 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-gray-200 text-sm">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => router.push(`${pathname}/${user.id}/edit`)}
            >
              Edit
            </button>
            <button
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              onClick={async () => {
                if (typeof companyId === 'string') {
                  await deleteUser(user.id, companyId);
                } else if (Array.isArray(companyId) && companyId.length > 0) {
                  await deleteUser(user.id, companyId[0]);
                } else {
                  console.error('Invalid companyId:', companyId);
                }
              }}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
