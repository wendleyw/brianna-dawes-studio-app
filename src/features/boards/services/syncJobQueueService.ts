import { supabase } from '@shared/lib/supabase';
import { env } from '@shared/config/env';

export type SyncJobType = 'project_sync' | 'master_board_sync';

export const syncJobQueueService = {
  async enqueue(jobType: SyncJobType, args: { projectId?: string; boardId?: string; payload?: unknown } = {}) {
    if (!env.app.useSyncJobs) {
      return null;
    }

    const { data, error } = await supabase.rpc('enqueue_sync_job', {
      p_job_type: jobType,
      p_project_id: args.projectId ?? null,
      p_board_id: args.boardId ?? null,
      p_payload: (args.payload ?? {}) as unknown,
      p_run_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as string;
  },
};

