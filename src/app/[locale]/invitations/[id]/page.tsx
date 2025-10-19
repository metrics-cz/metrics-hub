'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Building, Check, X, Clock, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  company: {
    id: string;
    name: string;
    logo_url?: string;
  };
  inviter: {
    email: string;
    name?: string;
  };
}

export default function InvitationPage() {
  const { id } = useParams<{ id: string }>();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (!user || !id) return;

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${id}`);
        if (response.ok) {
          const data = await response.json();
          setInvitation(data.data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Invitation not found');
        }
      } catch (err) {
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [user, id]);

  const handleResponse = async (action: 'accept' | 'reject') => {
    if (!invitation) return;

    setResponding(true);
    try {
      const response = await fetch(`/api/invitations/${invitation.id}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (action === 'accept' && data.data?.redirect_url) {
          router.push(data.data.redirect_url);
        } else {
          // Show success message and redirect to dashboard or companies
          setTimeout(() => {
            router.push('/en/companies');
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} invitation`);
      }
    } catch (err) {
      setError(`Failed to ${action} invitation`);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Vlastník';
      case 'admin': return 'Administrátor';
      case 'member': return 'Člen';
      default: return role;
    }
  };

  const getStatusIcon = (status: string, isExpired: boolean) => {
    if (isExpired) return <Clock className="text-orange-500" size={24} />;
    
    switch (status) {
      case 'accepted':
        return <Check className="text-green-500" size={24} />;
      case 'rejected':
        return <X className="text-red-500" size={24} />;
      case 'expired':
        return <Clock className="text-orange-500" size={24} />;
      default:
        return <AlertCircle className="text-blue-500" size={24} />;
    }
  };

  const getStatusText = (status: string, isExpired: boolean) => {
    if (isExpired) return 'Platnost vypršela';
    
    switch (status) {
      case 'accepted': return 'Přijato';
      case 'rejected': return 'Odmítnuto';
      case 'expired': return 'Platnost vypršela';
      case 'pending': return 'Čeká na odpověď';
      default: return status;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Pro zobrazení pozvánky se musíte přihlásit.</p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Přihlásit se
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám pozvánku...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Pozvánka nenalezena
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'Požadovaná pozvánka neexistuje nebo již byla zpracována.'}
          </p>
          <button
            onClick={() => router.push('/en/companies')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Zpět na dashboard
          </button>
        </div>
      </div>
    );
  }

  const canRespond = invitation.status === 'pending' && !invitation.isExpired && !responding;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              {getStatusIcon(invitation.status, invitation.isExpired)}
              <div>
                <h1 className="text-2xl font-bold">
                  Pozvánka do společnosti
                </h1>
                <p className="text-blue-100">
                  {getStatusText(invitation.status, invitation.isExpired)}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Company Info */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {invitation.company.logo_url ? (
                <img
                  src={invitation.company.logo_url}
                  alt={invitation.company.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="text-blue-600" size={24} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {invitation.company.name}
                </h2>
                <p className="text-gray-600">
                  Pozice: <span className="font-medium">{getRoleLabel(invitation.role)}</span>
                </p>
              </div>
            </div>

            {/* Invitation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Pozval vás
                </label>
                <p className="text-gray-900">
                  {invitation.inviter.name || invitation.inviter.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Platnost do
                </label>
                <p className="text-gray-900">
                  {formatDate(invitation.expiresAt)}
                </p>
              </div>
            </div>

            {/* Personal Message */}
            {invitation.message && (
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Osobní zpráva
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 italic">"{invitation.message}"</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {canRespond ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handleResponse('accept')}
                  disabled={responding}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {responding ? 'Zpracovávám...' : 'Přijmout pozvánku'}
                </button>
                <button
                  onClick={() => handleResponse('reject')}
                  disabled={responding}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {responding ? 'Zpracovávám...' : 'Odmítnout'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {invitation.status === 'accepted' && 'Tuto pozvánku jste již přijali.'}
                  {invitation.status === 'rejected' && 'Tuto pozvánku jste odmítli.'}
                  {(invitation.status === 'expired' || invitation.isExpired) && 'Platnost této pozvánky vypršela.'}
                </p>
                <button
                  onClick={() => router.push('/en/companies')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Zpět na dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}