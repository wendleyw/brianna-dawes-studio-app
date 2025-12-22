/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@shared/lib/supabase';
import { useAuth } from '@features/auth';
import { createLogger } from '@shared/lib/logger';
import type { Notification } from '../domain/notification.types';

const logger = createLogger('NotificationContext');

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 50;

  const mapNotification = useCallback((n: Record<string, unknown>): Notification => {
    return {
      id: n.id as string,
      userId: n.user_id as string,
      type: n.type as Notification['type'],
      title: n.title as string,
      message: n.message as string,
      data: (n.data as Notification['data']) || {},
      isRead: (n.is_read as boolean) ?? false,
      createdAt: n.created_at as string,
    };
  }, []);

  const fetchNotificationsPage = useCallback(
    async (beforeCreatedAt?: string) => {
      if (!user?.id) return { mapped: [] as Notification[], hasMoreResult: false };

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (beforeCreatedAt) {
        query = query.lt('created_at', beforeCreatedAt);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((row) => mapNotification(row as Record<string, unknown>));
      return { mapped, hasMoreResult: mapped.length === PAGE_SIZE };
    },
    [PAGE_SIZE, mapNotification, user?.id]
  );

  // Fetch notifications on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const { mapped, hasMoreResult } = await fetchNotificationsPage();
        setNotifications(mapped);
        setHasMore(hasMoreResult);
      } catch (error) {
        logger.error('Failed to fetch notifications', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          const notification = mapNotification(n);
          setNotifications((prev) => {
            if (prev.some((p) => p.id === notification.id)) return prev;
            return [notification, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotificationsPage, isAuthenticated, mapNotification, user?.id]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setIsLoading(true);
    try {
      const { mapped, hasMoreResult } = await fetchNotificationsPage();
      setNotifications(mapped);
      setHasMore(hasMoreResult);
    } catch (error) {
      logger.error('Failed to refresh notifications', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNotificationsPage, isAuthenticated, user?.id]);

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    if (isLoadingMore || !hasMore) return;

    const oldest = notifications[notifications.length - 1]?.createdAt;
    if (!oldest) return;

    setIsLoadingMore(true);
    try {
      const { mapped, hasMoreResult } = await fetchNotificationsPage(oldest);
      setNotifications((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = mapped.filter((n) => !seen.has(n.id));
        return [...prev, ...next];
      });
      setHasMore(hasMoreResult);
    } catch (error) {
      logger.error('Failed to load more notifications', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchNotificationsPage, hasMore, isAuthenticated, isLoadingMore, notifications, user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotifications([]);
      setHasMore(false);
    }
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value: NotificationContextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      hasMore,
      refresh,
      loadMore,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      hasMore,
      refresh,
      loadMore,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
