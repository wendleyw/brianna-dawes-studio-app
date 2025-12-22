import { supabase } from '@shared/lib/supabase';
import { miroAdapter } from '@shared/lib/miroAdapter';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('MiroItemRegistry');
let cachedBoardId: string | null = null;

async function getBoardId(): Promise<string | null> {
  if (cachedBoardId) return cachedBoardId;
  const info = await miroAdapter.getBoardInfo();
  cachedBoardId = info?.id ?? null;
  return cachedBoardId;
}

export async function registerMiroItem(args: {
  projectId: string;
  itemType: string;
  miroItemId: string;
  fieldKey?: string;
  versionNumber?: number;
}): Promise<void> {
  try {
    const boardId = await getBoardId();
    if (!boardId) return;
    const { error } = await supabase.rpc('upsert_miro_item_map', {
      p_board_id: boardId,
      p_project_id: args.projectId,
      p_item_type: args.itemType,
      p_miro_item_id: args.miroItemId,
      p_field_key: args.fieldKey ?? null,
      p_version_number: args.versionNumber ?? null,
    });
    if (error) {
      logger.warn('Failed to register Miro item mapping', { error: error.message, itemType: args.itemType });
    }
  } catch (err) {
    logger.warn('Failed to register Miro item mapping', err);
  }
}
