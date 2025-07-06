'use client';

import { Bell, Check, X, ExternalLink, Users } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useNotifications, Notification } from '@/components/providers/NotificationProvider';

interface NotificationBellProps {
  showText?: boolean;
  text?: string;
  isMobileSidebar?: boolean;
  onMobileClick?: () => void;
}

export default function NotificationBell({ showText = false, text = 'Notifications', isMobileSidebar = false, onMobileClick }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use the centralized notification context
  const { notifications, unreadCount, isLoading: loading, markAsRead, markAllAsRead } = useNotifications();


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
        // Notifications will be refreshed automatically via real-time subscription
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      alert(`Failed to ${action} invitation`);
    }
  };

  // Handle bell click - navigate to notifications page on desktop or mobile sidebar, toggle dropdown on mobile header only
  const handleBellClick = () => {
    if (isDesktop || isMobileSidebar) {
      if (isMobileSidebar && onMobileClick) {
        onMobileClick();
      }
      router.push('/notifications');
    } else {
      setOpen(!open);
    }
  };

  // Handle screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        bellRef.current &&
        dropdownRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);


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
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
        );
      case 'invitation_accepted':
        return (
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check size={16} className="text-green-400" />
          </div>
        );
      case 'invitation_rejected':
        return (
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <X size={16} className="text-red-400" />
          </div>
        );
      case 'user_joined_company':
        return (
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <Users size={16} className="text-green-400" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center">
            <Bell size={16} className="text-gray-400" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={handleBellClick}
        className={`w-full h-10 flex items-center gap-2 border-none relative transition-all duration-200 group ${isMobileSidebar ? 'px-3 py-2 rounded hover:bg-primary-700 dark:hover:bg-gray-600' : 'px-3 py-2 rounded hover:bg-primary-700 dark:hover:bg-gray-600'}`}
      >
        <Bell 
          size={18} 
          className={`transition-all duration-200 ${open ? 'text-blue-400' : 'text-white group-hover:text-blue-300'}`}
        />
        {showText && <span className="text-sm">{text}</span>}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && !isDesktop && !isMobileSidebar && (
        <div 
          ref={dropdownRef}
          className="fixed right-4 top-16 w-80 bg-[#1e1e1e] rounded-lg shadow-2xlmd:absolute md:right-0 md:top-12 animate-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1e1e1e] to-[#252525] rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-400" />
              <h3 className="font-semibold text-white">Notifikace</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200 hover:bg-blue-400/10 px-2 py-1 rounded"
                >
                  Označit vše jako přečtené
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors duration-200 hover:bg-white/10 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-neutral-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Načítám notifikace...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                <Bell size={32} className="mx-auto mb-2 text-neutral-600" />
                <p className="text-sm font-medium">Žádné notifikace</p>
                <p className="text-xs text-neutral-500 mt-1">Zde se zobrazí vaše notifikace</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-white/5 hover:bg-white/5 transition-all duration-200 cursor-pointer group ${
                    !notification.read ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={`font-medium text-sm truncate ${!notification.read ? 'text-white' : 'text-neutral-300'}`}>
                          {notification.title}
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                          )}
                        </h4>
                        <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-neutral-300 mb-2 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Invitation Actions */}
                      {notification.type === 'company_invitation' && notification.invitation?.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvitationResponse(notification.invitation!.id, 'accept');
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-all duration-200 hover:shadow-md font-medium"
                          >
                            ✓ Přijmout
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvitationResponse(notification.invitation!.id, 'reject');
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-all duration-200 hover:shadow-md font-medium"
                          >
                            ✗ Odmítnout
                          </button>
                        </div>
                      )}

                      {/* Action URL */}
                      {notification.actionUrl && notification.type !== 'company_invitation' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(notification.actionUrl!);
                            if (!notification.read) markAsRead(notification.id);
                            setOpen(false);
                          }}
                          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 mt-2 hover:bg-blue-400/10 px-2 py-1 rounded transition-all duration-200"
                        >
                          <ExternalLink size={12} />
                          Zobrazit detail
                        </button>
                      )}

                      {/* Mark as read button for unread notifications */}
                      {!notification.read && notification.type !== 'company_invitation' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-xs text-neutral-400 hover:text-neutral-200 mt-2 hover:bg-neutral-700 px-2 py-1 rounded transition-all duration-200"
                        >
                          Označit jako přečtené
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 text-center bg-gradient-to-r from-[#1e1e1e] to-[#252525] rounded-b-lg">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setOpen(false);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200 hover:bg-blue-400/10 px-3 py-2 rounded-md w-full"
              >
                Zobrazit všechny notifikace →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}