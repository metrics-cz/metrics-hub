'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import UserTable from '@/components/user/UserTable';
import { Plus } from 'lucide-react';
import SearchBar from '@/components/user/SearchBar';
import { fetchUsersByCompanyMini } from '@/lib/company/fetchUsersMini';
import { type CompanyUserMini } from '@/lib/validation/companyUserMiniSchema';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function UsersPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [users, setUsers] = useState<CompanyUserMini[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  /* fetch once companyId is available */
  useEffect(() => {
    if (!companyId) return;
    fetchUsersByCompanyMini(companyId).then(setUsers);
  }, [companyId]);

  const handleSendInvite = async (email: string, role: string, message?: string) => {
    if (!companyId) return;

    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Chyba: Nejste přihlášeni');
        return;
      }

      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          companyId,
          role,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        const messageText = data.data.type === 'in_app_notification' 
          ? 'Pozvánka byla odeslána prostřednictvím notifikace v aplikaci'
          : 'Pozvánka byla odeslána na email';
        
        alert(`Úspěch! ${messageText}`);
        setShowModal(false);
        
        // Refresh user list
        fetchUsersByCompanyMini(companyId).then(setUsers);
      } else {
        // Show error message
        let errorMessage = 'Nepodařilo se odeslat pozvánku';
        
        switch (data.code) {
          case 'ALREADY_MEMBER':
            errorMessage = 'Uživatel je již členem této společnosti';
            break;
          case 'INVITATION_PENDING':
            errorMessage = 'Uživatel již má nevyřízenou pozvánku';
            break;
          case 'USER_NOT_FOUND':
            errorMessage = 'Uživatel s tímto emailem není registrován. Musí se nejprve zaregistrovat.';
            break;
          case 'INVALID_EMAIL':
            errorMessage = 'Neplatný formát emailu';
            break;
          case 'INSUFFICIENT_ROLE':
            errorMessage = 'Nemáte oprávnění posílat pozvánky';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = 'Příliš mnoho pozvánek. Počkejte chvíli.';
            break;
          default:
            errorMessage = data.error || errorMessage;
        }
        
        alert(`Chyba: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Nepodařilo se odeslat pozvánku. Zkuste to prosím znovu.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between mb-2">
        <h1 className="text-3xl font-semibold mb-4">{t('users.title')}</h1>
        <button
          className="bg-primary text-white rounded-md p-2 inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus />
          {t('users.addUser')}
        </button>
      </div>

      <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
      <UserTable users={filtered} />

      {showModal && (
        <InviteUserModal
          onSend={handleSendInvite}
          onClose={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
}

function InviteUserModal({
  onSend,
  onClose,
  loading,
}: {
  onSend: (email: string, role: string, message?: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const t = useTranslations();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = () => {
    setEmailError('');

    if (!email) {
      setEmailError('Email je povinný');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Neplatný formát emailu');
      return;
    }

    onSend(email, role, message || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{t('users.inviteUser')}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('users.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            onKeyPress={handleKeyPress}
            className={`w-full border rounded px-3 py-2 ${
              emailError ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="uzivatel@example.com"
            disabled={loading}
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="member">{t('users.member')}</option>
            <option value="admin">{t('users.admin')}</option>
            <option value="superadmin">Super Admin</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Osobní zpráva (volitelné)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Přidejte osobní zprávu k pozvánce..."
            disabled={loading}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !email}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            ) : (
              t('common.send')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}