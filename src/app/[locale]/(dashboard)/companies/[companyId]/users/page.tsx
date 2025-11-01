'use client';

import { useEffect, useState } from 'react';
import UserTable from '@/components/user/UserTable';
import { Plus } from 'lucide-react';
import SearchBar from '@/components/user/SearchBar';
import { fetchUsersByCompanyMini } from '@/lib/company/fetchUsersMini';
import { type CompanyUserMini } from '@/lib/validation/companyUserMiniSchema';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useActiveCompany } from '@/lib/activeCompany';
import { cachedApi } from '@/lib/cachedApi';

export default function UsersPage() {
 const company = useActiveCompany();
 const [users, setUsers] = useState<CompanyUserMini[]>([]);
 const [showModal, setShowModal] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(false);
 const [userRole, setUserRole] = useState<string | null>(null);
 const [loadingRole, setLoadingRole] = useState(true);
 const t = useTranslations();
 const { user } = useAuth();

 /* fetch users and user role */
 useEffect(() => {
  if (!company?.id || !user?.id) return;

  const fetchUsersAndRole = async () => {
   try {
    setLoading(true);
    setLoadingRole(true);
    
    // Fetch users
    const usersData = await fetchUsersByCompanyMini(company.id);
    setUsers(usersData || []);
    
    // Fetch user role
    const { data: roleData } = await supabase
     .from('company_users')
     .select('role')
     .eq('company_id', company.id)
     .eq('user_id', user.id)
     .single();
    
    setUserRole(roleData?.role || null);
   } catch (error) {
    console.error('Error fetching users and role:', error);
    setUsers([]); // Set empty array as fallback
    setUserRole(null);
   } finally {
    setLoading(false);
    setLoadingRole(false);
   }
  };

  fetchUsersAndRole();
 }, [company?.id, user?.id]);

 // Check if current user can add other users (admin, superadmin, or owner)
 const canAddUsers = userRole && ['admin', 'superadmin', 'owner'].includes(userRole);

 const handleSendInvite = async (email: string, role: string, message?: string) => {
  if (!company?.id) return;

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
     companyId: company.id,
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

    // Invalidate cache and refresh user list
    cachedApi.invalidateCompanyUsers(company.id);
    fetchUsersByCompanyMini(company.id).then(setUsers);
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
  <div className="p-8 min-h-screen">
   <div className="flex justify-between mb-2">
    <h1 className="text-3xl font-semibold mb-4 text-primary">{t('users.title')}</h1>
    {canAddUsers && !loadingRole && (
     <button
      className="bg-emerald-600 text-white rounded-md p-2 inline-flex items-center gap-2 hover:bg-emerald-700 transition-colors"
      onClick={() => setShowModal(true)}
     >
      <Plus />
      {t('users.addUser')}
     </button>
    )}
   </div>

   <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
   
   {loading ? (
    <div className="flex justify-center items-center py-8">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
     <span className="ml-2 text-secondary">Loading users...</span>
    </div>
   ) : (
    <UserTable users={filtered} />
   )}

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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ">
   <div className=" bg-white text-primary rounded-lg shadow-lg w-full max-w-md p-6">
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
      className={`w-full bg-input text-primary border rounded px-3 py-2 ${emailError ? 'border-red-500' : 'border-border-default'
       } focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-text-muted`}
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
      className="w-full bg-input text-primary border border-border-default rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
      className="w-full bg-input text-primary border border-border-default rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-text-muted"
      rows={3}
      placeholder="Přidejte osobní zprávu k pozvánce..."
      disabled={loading}
     />
    </div>

    <div className="flex justify-end gap-3">
     <button
      onClick={onClose}
      disabled={loading}
      className="px-4 py-2 text-sm bg-input hover:bg-hover-strong text-primary rounded disabled:opacity-50 transition-colors"
     >
      {t('common.cancel')}
     </button>
     <button
      onClick={handleSubmit}
      disabled={loading || !email}
      className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
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