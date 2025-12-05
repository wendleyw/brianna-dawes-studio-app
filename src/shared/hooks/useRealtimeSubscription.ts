import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const logger = createLogger('RealtimeSubscription');

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions<T> {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T, oldRecord: T) => void;
  onDelete?: (payload: T) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          onUpdate?.(payload.new as T, payload.old as T);
          break;
        case 'DELETE':
          onDelete?.(payload.old as T);
          break;
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;

    const channel = supabase.channel(channelName);

    const subscription = (channel as ReturnType<typeof supabase.channel>).on(
      'postgres_changes' as unknown as 'system',
      {
        event,
        schema,
        table,
        filter,
      } as unknown as { event: 'system' },
      handleChange as unknown as () => void
    );

    subscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug(`Subscribed to ${table} changes`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, schema, event, filter, enabled, handleChange]);

  return {
    channel: channelRef.current,
  };
}
