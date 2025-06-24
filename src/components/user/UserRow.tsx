'use client';

import { CompanyUserMini as User } from '@/lib/validation/companyUserMiniSchema';
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
    <tr className="shadow-sm rounded-md bg-white dark:bg-gray-800">
      <td className="flex items-center gap-3 px-4 py-3">
        {user.status === 'pending' ? (
          // For pending invitations, show email instead of name/avatar
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">!</span>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{user.email}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Pozvaný uživatel</div>
            </div>
          </div>
        ) : (
          // For active users, show normal avatar and name
          <>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <UserInitialsIcon name={user.fullName} />
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
            </div>
          </>
        )}
      </td>

      {/*   <td className="px-4 py-3">{user.role}</td> */}
      <td className="px-4 py-3">{user.role || '—'}</td>

      <td className='px-4 py-3'>{user.lastSignIn ? new Date(user.lastSignIn).toLocaleString("sk-SK") : '—'}</td>
      <td className="px-4 py-3">
        {user.status === 'active' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 rounded-full">
            <span className="w-2 h-2 bg-primary-500 rounded-full" />
            Aktivní
          </span>
        ) : user.status === 'pending' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            Čeká na pozvánku
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full">
            <span className="w-2 h-2 bg-gray-500 rounded-full" />
            Neznámý
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-right relative">
        {user.status === 'active' ? (
          <>
            <button
              className="text-gray-500 border-none size-11 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-three-dots-vertical" viewBox="0 0 16 16">
                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-4 z-10 mt-2 w-32 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 text-sm">
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onClick={() => router.push(`${pathname}/${user.id}/edit`)}
                >
                  Edit
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-sm">Čeká</span>
        )}
      </td>
    </tr>
  );
}
