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
  <tr className="shadow-sm bg-card rounded">

   <td className="flex items-center gap-3 px-4 py-3">
    {user.status === 'pending' ? (
     // For pending invitations, show email instead of name/avatar
     <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-badge-pending-bg flex items-center justify-center">
       <span className="text-badge-pending-text text-sm font-medium">!</span>
      </div>
      <div>
       <div className="font-medium text-primary">{user.email}</div>
       <div className="text-sm text-muted">Pozvaný uživatel</div>
      </div>
     </div>
    ) : (
     // For active users, show normal avatar and name
     <>
      {user.avatarUrl ? (
       <img
        src={user.avatarUrl}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 aspect-square"
       />
      ) : (
       <UserInitialsIcon name={user.fullName} />
      )}
      <div>
       <div className="font-medium text-primary">{user.fullName}</div>
       <div className="text-sm text-muted">{user.email}</div>
      </div>
     </>
    )}
   </td>

   <td className="px-4 py-3">{user.role || '—'}</td>

   <td className='px-4 py-3'>{user.lastSignIn ? new Date(user.lastSignIn).toLocaleString("sk-SK") : '—'}</td>

   <td className="px-4 py-3">
    {user.status === 'active' ? (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-accent rounded-full">
      <span className="w-2 h-2 bg-primary-500 rounded-full" />
      Aktivní
     </span>
    ) : user.status === 'pending' ? (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-badge-pending-text rounded-full">
      <span className="w-2 h-2 bg-orange-500 rounded-full" />
      Čeká na pozvánku
     </span>
    ) : (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary rounded-full">
      <span className="w-2 h-2 bg-base0 rounded-full" />
      Neznámý
     </span>
    )}
   </td>

   <td className="px-4 py-3 text-right relative">
    {user.status === 'active' ? (
     <>
      <button
       className="text-muted border-none size-11 hover:text-secondary text-secondary hover:text-secondary"
       onClick={() => setMenuOpen(!menuOpen)}
      >
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-three-dots-vertical" viewBox="0 0 16 16">
        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
       </svg>
      </button>

      {menuOpen && (
       <div className="absolute right-4 z-10 mt-2 w-32 rounded-md shadow-lg bg-card ring-1 ring-border-default text-sm">
        <button
         className="w-full px-4 py-2 text-left hover:bg-hover text-primary"
         onClick={() => router.push(`${pathname}/${user.id}/edit`)}
        >
         Edit
        </button>
        <button
         className="w-full px-4 py-2 text-left text-error hover:bg-hover"
         onClick={async () => {
          if (typeof companyId === 'string') {
           await deleteUser(user.id, companyId);
          } else if (Array.isArray(companyId) && companyId.length > 0) {
           await deleteUser(user.id, companyId[0] || '');
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
     <span className="text-muted text-sm">Čeká</span>
    )}
   </td>
  </tr>
 );
}
