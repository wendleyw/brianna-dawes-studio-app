import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const logger = createLogger('RealtimePresence');

interface PresenceUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastSeen: string;
  status: 'online' | 'away' | 'offline';
}

interface UseRealtimePresenceOptions {
  channelName: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  enabled?: boolean;
}

export function useRealtimePresence({
  channelName,
  user,
  enabled = true,
}: UseRealtimePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const updatePresence = useCallback(
    async (status: 'online' | 'away') => {
      if (!channelRef.current) return;

      await channelRef.current.track({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
        lastSeen: new Date().toISOString(),
        status,
      });
    },
    [user]
  );

  useEffect(() => {
    if (!enabled || !user.id) return;

    const channel = supabase.channel(`presence-${channelName}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];

        Object.values(state).forEach((presences) => {
          if (presences.length > 0) {
            users.push(presences[0] as PresenceUser);
          }
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('User joined', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('User left', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl || null,
            lastSeen: new Date().toISOString(),
            status: 'online',
          });
        }
      });

    channelRef.current = channel;

    // Handle visibility change for away status
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [channelName, user, enabled, updatePresence]);

  return {
    onlineUsers,
    isConnected,
    updatePresence,
  };
}
