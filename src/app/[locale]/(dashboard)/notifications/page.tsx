'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useTranslations } from 'next-intl';
import { Bell, Check, X, ExternalLink, Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
  invitation?: {
    id: string;
    status: string;
    role: string;
    company: {
      name: string;
      logo_url?: string;
    };
    inviter: {
      email: string;
    };
  };
}

interface NotificationData {
  notifications: Notification[];
  unread_count: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data: { success: boolean; data: NotificationData } = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications);
          setUnreadCount(data.data.unread_count);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/invitations/${invitationId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (action === 'accept' && data.data?.redirect_url) {
          router.push(data.data.redirect_url);
        }
        fetchNotifications();
      } else {
        const error = await response.json();
        alert(error?.error || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      alert(`Failed to ${action} invitation`);
    }
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'právě teď';
    if (diffInSeconds < 3600) return `před ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `před ${Math.floor(diffInSeconds / 3600)} h`;
    return `před ${Math.floor(diffInSeconds / 86400)} d`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'company_invitation':
        return (
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Users size={20} className="text-blue-400" />
          </div>
        );
      case 'invitation_accepted':
        return (
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check size={20} className="text-green-400" />
          </div>
        );
      case 'invitation_rejected':
        return (
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <X size={20} className="text-red-400" />
          </div>
        );
      case 'user_joined_company':
        return (
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Users size={20} className="text-green-400" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
            <Bell size={20} className="text-gray-400" />
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-white">Notifikace</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-neutral-400 mt-1">
                {unreadCount} nepřečtených notifikací
              </p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Označit vše jako přečtené
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-neutral-400">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Načítám notifikace...</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Bell size={48} className="mx-auto mb-4 text-neutral-600" />
            <h3 className="text-lg font-medium mb-2">Žádné notifikace</h3>
            <p className="text-sm text-neutral-500">Zde se zobrazí vaše notifikace</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-6 bg-[#1e1e1e] rounded-lg border transition-all duration-200 hover:border-white/20 ${
                !notification.read 
                  ? 'border-blue-500/50 bg-blue-500/5' 
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-medium text-lg ${!notification.read ? 'text-white' : 'text-neutral-300'}`}>
                      {notification.title}
                      {!notification.read && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                      )}
                    </h4>
                    <span className="text-sm text-neutral-400 flex-shrink-0">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-neutral-300 mb-4 leading-relaxed">
                    {notification.message}
                  </p>

                  {/* Invitation Actions */}
                  {notification.type === 'company_invitation' && notification.invitation?.status === 'pending' && (
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => handleInvitationResponse(notification.invitation!.id, 'accept')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 font-medium"
                      >
                        ✓ Přijmout
                      </button>
                      <button
                        onClick={() => handleInvitationResponse(notification.invitation!.id, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium"
                      >
                        ✗ Odmítnout
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {notification.actionUrl && notification.type !== 'company_invitation' && (
                      <button
                        onClick={() => {
                          router.push(notification.actionUrl!);
                          if (!notification.read) markAsRead(notification.id);
                        }}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        <ExternalLink size={14} />
                        Zobrazit detail
                      </button>
                    )}

                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        Označit jako přečtené
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}