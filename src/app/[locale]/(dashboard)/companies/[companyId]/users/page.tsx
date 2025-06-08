'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import UserTable from '@/components/user/UserTable';
import { Plus } from 'lucide-react';
import SearchBar from '@/components/user/SearchBar';
import { fetchUsersByCompanyMini } from '@/lib/company/companyUserMini';
import { type CompanyUserMini } from '@/lib/validation/companyUserMiniSchema'

export default function UsersPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [users, setUsers] = useState<CompanyUserMini[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /* fetch once companyId is available */
  useEffect(() => {
    if (!companyId) return;
    fetchUsersByCompanyMini(companyId).then(setUsers);
  }, [companyId]);

  const handleSendInvite = (email: string, role: string) => {
    // TODO: call your invite endpoint
    console.log('Invite', email, role);
    setShowModal(false);
  };

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between mb-2">
        <h1 className="text-3xl font-semibold mb-4">Uživatelé</h1>
        <button
          className="bg-primary text-white rounded-md p-2 inline-flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus />
          Přidat uživatele
        </button>
      </div>

      <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} /> 
      <UserTable users={filtered} />

     {/*  {showModal && (
        <InviteUserModal onSend={handleSendInvite} onClose={() => setShowModal(false)} />
      )} */}
    </div>
  );
}

/* invite modal unchanged … */
