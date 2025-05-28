'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchUsersByCompany } from '@/lib/firebase/firebaseData';
import UserTable from '@/components/user/UserTable';
import { User } from '@/lib/validation/firebaseSchemas';
import { Plus } from 'lucide-react';
import SearchBar from '@/components/user/SearchBar';

export default function UsersPage() {
  const { companyId } = useParams();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof companyId === 'string') {
      fetchUsersByCompany(companyId).then(setUsers).catch(console.error);
    }
  }, [companyId]);

  const handleSendInvite = (email: string, role: string) => {
    console.log('Send invite to:', email, 'with role:', role);
    // Optionally: call an API to send invitation here
    setShowModal(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between mb-2">
        <h1 className="text-3xl font-semibold mb-4">Uživatelé</h1>
        <button
          className="col-span-2 bg-primary text-white rounded-md p-2 disabled:opacity-50 inline-flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus />
          Přidat uživatele
        </button>
      </div>
      <SearchBar />
      <UserTable users={users} />

      {showModal && (
        <InviteUserModal
          onSend={handleSendInvite}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Inline modal component
function InviteUserModal({
  onSend,
  onClose,
}: {
  onSend: (email: string, role: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Pozvat uživatele</h2>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          placeholder="uzivatel@example.com"
        />

        <label className="block text-sm font-medium mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-6"
        >
          <option value="member">Člen</option>
          <option value="admin">Administrátor</option>
        </select>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Zavřít
          </button>
          <button
            onClick={() => onSend(email, role)}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Odeslat
          </button>
        </div>
      </div>
    </div>
  );
}
