'use client';

import { User } from '@/lib/validation/userSchema';
import { useState } from 'react';

type Props = {
  user: User;
};

export default function UserRow({ user }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <tr className="shadow-sm rounded-md">
      <td className="flex items-center gap-3 px-4 py-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-gray-400 rounded-full">
            {initials}
          </div>
        )}
        <div>
          <div className="font-medium text-gray-900">{user.name}</div>
        </div>
      </td>

      <td className="px-4 py-3">{user.role}</td>
      <td className="px-4 py-3">{user.lastLogin || '—'}</td>

      <td className="px-4 py-3">
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
      </td>

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
              onClick={() => alert(`Edit ${user.id}`)}
            >
              Edit
            </button>
            <button
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              onClick={() => alert(`Delete ${user.id}`)}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
