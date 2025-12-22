// Supabase Edge Function: sync-worker
//
// Purpose (foundation): claim and run one durable sync job from `public.sync_jobs`.
// This is safe to deploy behind a feature flag and now includes:
// - Admin-gated invocation (user JWT required)
// - Retry/backoff with `fail_sync_job`
// - `project_sync` implementation using Miro REST API (requires Miro access token)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getMiroAccessToken } from '../_shared/miroTokens.ts';

type SyncJob = {
  id: string;
  job_type: 'project_sync' | 'master_board_sync' | 'miro_item_sync';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  project_id: string | null;
  board_id: string | null;
  payload: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function nowIso() {
  return new Date().toISOString();
}

function safeString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function sanitizeHeaderToken(raw: string): { ok: true; token: string } | { ok: false; message: string } {
  // Prevent invalid Request header values:
  // - remove all whitespace (copy/paste often includes newlines)
  // - remove invisible unicode formatting chars (common when copying from logs/chats)
  // - reject control chars and any unexpected characters for OAuth/JWT tokens
  const token = raw
    // \s may miss some unicode spaces depending on engine; remove common ones explicitly too.
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, '')
    // Unicode "format" / zero-width characters frequently introduced by copy/paste
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');
  if (!token) return { ok: false, message: 'empty' };
  for (let i = 0; i < token.length; i++) {
    const code = token.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return { ok: false, message: 'contains_control_chars' };
  }
  // Miro OAuth tokens / JWTs are ASCII. Reject any non-ASCII.
  if (/[^\x21-\x7E]/.test(token)) {
    const codes = new Set<number>();
    for (let i = 0; i < token.length; i++) {
      const c = token.charCodeAt(i);
      if (c < 0x21 || c > 0x7e) codes.add(c);
      if (codes.size >= 8) break;
    }
    const codeList = [...codes].map((c) => `0x${c.toString(16)}`).join(',');
    return { ok: false, message: `contains_non_ascii_chars:${codeList || 'unknown'}` };
  }
  // Allow common bearer token charset: base64/base64url/JWT/opaque tokens.
  // Include '-' for base64url tokens.
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(token)) return { ok: false, message: 'contains_invalid_chars' };
  return { ok: true, token };
}

function normalizeDateToYYYYMMDD(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDueDateToIso(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Accept either full ISO or YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function retryDelaySeconds(attemptCount: number): number {
  // Exponential backoff with caps:
  // attempt_count is incremented when the job is claimed.
  const base = 30;
  const pow = Math.max(0, attemptCount - 1);
  const delay = base * Math.pow(2, pow);
  return Math.min(60 * 30, Math.max(10, Math.floor(delay))); // 10s .. 30m
}

function shouldRetryMiroStatus(status: number): boolean {
  // Non-retryable: invalid/expired token or forbidden
  if (status === 401 || status === 403) return false;
  // Retryable: throttling and transient errors
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  // Default: do not retry
  return false;
}

type MiroBoard = { id: string; name?: string };
type MiroFrame = { id: string; data?: { title?: string }; position?: { x?: number; y?: number }; geometry?: { width?: number; height?: number } };
type MiroCard = { id: string; data?: { title?: string; description?: string; dueDate?: string }; position?: { x?: number; y?: number }; geometry?: { width?: number; height?: number }; style?: { cardTheme?: string } };

const MIRO_BASE_URL = 'https://api.miro.com/v2';

function enc(value: string): string {
  return encodeURIComponent(value);
}

async function miroRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; raw?: unknown }> {
  const sanitized = sanitizeHeaderToken(accessToken);
  if (!sanitized.ok) {
    return {
      ok: false,
      status: 400,
      message: `invalid_miro_access_token:${sanitized.message}`,
    };
  }

  let res: Response;
  try {
    res = await fetch(`${MIRO_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sanitized.token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // This often happens when the token contains invalid header characters.
    if (message.includes('not a valid ByteString')) {
      return { ok: false, status: 400, message: 'invalid_miro_access_token:invalid_header_bytestring' };
    }
    return { ok: false, status: 0, message };
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text || null;
  }

  if (!res.ok) {
    let msg =
      typeof parsed === 'object' && parsed && 'message' in parsed && typeof (parsed as { message?: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : `Miro API error: ${res.status}`;

    // Surface any validation/structured details if present (truncated).
    if (parsed !== null) {
      const s = (() => {
        try {
          return JSON.stringify(parsed);
        } catch {
          return String(parsed);
        }
      })();
      msg = `${msg} raw=${s.slice(0, 800)}`;
    }

    return { ok: false, status: res.status, message: msg, raw: parsed };
  }

  return { ok: true, data: parsed as T };
}

async function miroGetBoard(accessToken: string, boardId: string) {
  return miroRequest<MiroBoard>(accessToken, 'GET', `/boards/${enc(boardId)}`);
}

async function miroListFrames(accessToken: string, boardId: string) {
  // Keep limit small to avoid API parameter issues.
  return miroRequest<{ data: MiroFrame[] }>(accessToken, 'GET', `/boards/${enc(boardId)}/frames?limit=50`);
}

async function miroCreateFrame(accessToken: string, boardId: string, args: { title: string; x: number; y: number; width: number; height: number }) {
  return miroRequest<{ id: string }>(accessToken, 'POST', `/boards/${enc(boardId)}/frames`, {
    data: { title: args.title, format: 'custom' },
    position: { x: args.x, y: args.y },
    geometry: { width: args.width, height: args.height },
  });
}

async function miroListCards(accessToken: string, boardId: string) {
  // Miro often rejects high limits with 400 Invalid parameters.
  // We keep it small and implement a fallback to /items if needed.
  const primary = await miroRequest<{ data: MiroCard[] }>(accessToken, 'GET', `/boards/${enc(boardId)}/cards?limit=50`);
  if (!primary.ok && primary.status === 400) {
    return miroRequest<{ data: MiroCard[] }>(accessToken, 'GET', `/boards/${enc(boardId)}/items?type=card&limit=50`);
  }
  return primary;
}

async function miroCreateCard(
  accessToken: string,
  boardId: string,
  args: { title: string; description: string; x: number; y: number; width: number; dueDate?: string | null }
) {
  const dueDate = normalizeDueDateToIso(args.dueDate);
  const width = Math.max(256, Number(args.width || 0));
  return miroRequest<{ id: string }>(accessToken, 'POST', `/boards/${enc(boardId)}/cards`, {
    data: { title: args.title, description: args.description, dueDate: dueDate ?? undefined },
    position: { x: args.x, y: args.y },
    geometry: { width, height: TIMELINE.CARD_HEIGHT },
  });
}

async function miroUpdateCard(
  accessToken: string,
  boardId: string,
  cardId: string,
  args: { title?: string; description?: string; x?: number; y?: number; dueDate?: string | null }
) {
  const data: Record<string, unknown> = {};
  if (args.title !== undefined || args.description !== undefined || args.dueDate !== undefined) {
    const dueDate = normalizeDueDateToIso(args.dueDate);
    data.data = {
      title: args.title,
      description: args.description,
      dueDate: dueDate ?? undefined,
    };
  }
  if (args.x !== undefined || args.y !== undefined) {
    data.position = { x: args.x, y: args.y };
  }

  return miroRequest<{ id: string }>(accessToken, 'PATCH', `/boards/${enc(boardId)}/cards/${enc(cardId)}`, data);
}

async function miroGetItem(accessToken: string, boardId: string, itemId: string) {
  return miroRequest<Record<string, unknown>>(accessToken, 'GET', `/boards/${enc(boardId)}/items/${enc(itemId)}`);
}

async function miroCreateText(
  accessToken: string,
  boardId: string,
  args: { content: string; x: number; y: number; width?: number; style?: { color?: string; fontSize?: string; textAlign?: 'left' | 'center' | 'right' } }
) {
  const style: Record<string, string> = {};
  if (args.style?.color) style.color = args.style.color;
  if (args.style?.fontSize) style.fontSize = args.style.fontSize;
  if (args.style?.textAlign) style.textAlign = args.style.textAlign;

  const payload: Record<string, unknown> = {
    data: { content: args.content },
    position: { x: args.x, y: args.y },
  };

  if (args.width !== undefined) payload.geometry = { width: args.width };
  if (Object.keys(style).length) payload.style = style;

  return miroRequest<{ id: string }>(accessToken, 'POST', `/boards/${enc(boardId)}/texts`, payload);
}

async function miroCreateShape(
  accessToken: string,
  boardId: string,
  args: { shape: 'rectangle' | 'round_rectangle'; content?: string; x: number; y: number; width: number; height: number; style?: { fillColor?: string; borderColor?: string; borderWidth?: number; fontColor?: string; fontSize?: number | string; textAlign?: 'left' | 'center' | 'right' } }
) {
  const payload: Record<string, unknown> = {
    data: { shape: args.shape, content: args.content ?? '' },
    position: { x: args.x, y: args.y },
    geometry: { width: args.width, height: args.height },
  };

  if (args.style) payload.style = args.style;

  return miroRequest<{ id: string }>(accessToken, 'POST', `/boards/${enc(boardId)}/shapes`, payload);
}

async function miroUpdateShape(
  accessToken: string,
  boardId: string,
  shapeId: string,
  args: { content?: string; x?: number; y?: number; width?: number; height?: number; style?: { fillColor?: string; borderColor?: string; borderWidth?: number; fontColor?: string; fontSize?: number | string; textAlign?: 'left' | 'center' | 'right' } }
) {
  const payload: Record<string, unknown> = {};
  if (args.content !== undefined) payload.data = { content: args.content };
  if (args.x !== undefined || args.y !== undefined) payload.position = { x: args.x, y: args.y };
  if (args.width !== undefined || args.height !== undefined) payload.geometry = { width: args.width, height: args.height };
  if (args.style) payload.style = args.style;

  return miroRequest<{ id: string }>(accessToken, 'PATCH', `/boards/${enc(boardId)}/shapes/${enc(shapeId)}`, payload);
}

type TimelineStatus = 'overdue' | 'urgent' | 'in_progress' | 'review' | 'done';
const TIMELINE = {
  FRAME_WIDTH: 1000,
  FRAME_HEIGHT: 600,
  COLUMN_WIDTH: 130,
  COLUMN_HEIGHT: 480,
  COLUMN_GAP: 10,
  HEADER_HEIGHT: 28,
  TITLE_HEIGHT: 35,
  CARD_WIDTH: 120,
  CARD_HEIGHT: 80,
  CARD_GAP: 15,
  PADDING: 15,
  GAP_TO_PROJECTS: 50,
} as const;

const FRAME = {
  WIDTH: 800,
  HEIGHT: 720,
  GAP: 30,
  ROW_GAP: 50,
} as const;

const BRIEFING = {
  PADDING: 20,
  HEADER_HEIGHT: 50,
  FORM: {
    COLS: 3,
    ROWS: 3,
    CELL_WIDTH: 240,
    CELL_HEIGHT: 80,
    CELL_GAP: 10,
  },
} as const;

const BRIEFING_FIELDS: Array<{ key: string; label: string; col: number; row: number }> = [
  { key: 'projectOverview', label: 'Overview', col: 0, row: 0 },
  { key: 'targetAudience', label: 'Audience', col: 1, row: 0 },
  { key: 'goals', label: 'Goals', col: 2, row: 0 },
  { key: 'finalMessaging', label: 'Messaging', col: 0, row: 1 },
  { key: 'deliverables', label: 'Deliverables', col: 1, row: 1 },
  { key: 'resourceLinks', label: 'Resources', col: 2, row: 1 },
  { key: 'inspirations', label: 'Inspirations', col: 0, row: 2 },
  { key: 'styleNotes', label: 'Style', col: 1, row: 2 },
  { key: 'additionalNotes', label: 'Notes', col: 2, row: 2 },
];

const TIMELINE_COLUMNS: Array<{ id: TimelineStatus; label: string; color: string }> = [
  { id: 'overdue', label: 'OVERDUE', color: '#F59E0B' },
  { id: 'urgent', label: 'URGENT', color: '#EF4444' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#60A5FA' },
  { id: 'review', label: 'REVIEW', color: '#60A5FA' },
  { id: 'done', label: 'DONE', color: '#10B981' },
];

function mapProjectToTimelineStatus(project: { status: string; due_date?: string | null; due_date_approved?: boolean | null }): TimelineStatus {
  if (project.status === 'done' || project.status === 'archived') return 'done';

  const dueDate = project.due_date;
  if (dueDate && project.due_date_approved !== false) {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        due.setHours(23, 59, 59, 999);
      }
      if (due.getTime() < Date.now()) return 'overdue';
    }
  }

  if (project.status === 'urgent' || project.status === 'critical') return 'urgent';
  if (project.status === 'review') return 'review';
  return 'in_progress';
}

function findTimelineFrame(frames: MiroFrame[]): MiroFrame | null {
  const byTitle = frames.find((f) => (f.data?.title ?? '').includes('MASTER TIMELINE') || (f.data?.title ?? '').includes('Timeline Master'));
  if (byTitle) return byTitle;
  return null;
}

function extractCardDescription(card: MiroCard): string {
  return card.data?.description ?? '';
}

function extractCardPosition(card: MiroCard): { x: number; y: number } {
  return { x: Number(card.position?.x ?? 0), y: Number(card.position?.y ?? 0) };
}

function computeColumnX(colIndex: number, frameCenterX = 0): number {
  const frameLeft = frameCenterX - TIMELINE.FRAME_WIDTH / 2;
  const startX = frameLeft + TIMELINE.PADDING;
  return startX + TIMELINE.COLUMN_WIDTH / 2 + colIndex * (TIMELINE.COLUMN_WIDTH + TIMELINE.COLUMN_GAP);
}

function computeFirstCardY(frameCenterY = 0): number {
  const frameTop = frameCenterY - TIMELINE.FRAME_HEIGHT / 2;
  const dropZoneTop = frameTop + TIMELINE.PADDING + TIMELINE.TITLE_HEIGHT + TIMELINE.HEADER_HEIGHT + 10;
  return dropZoneTop + TIMELINE.CARD_HEIGHT / 2 + 10;
}

function stripHtml(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractProjectIdFromDescription(description?: string | null): string | null {
  if (!description) return null;
  const match = description.match(/projectId:([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}

function inferStatusFromCardX(x: number, frameCenterX = 0): TimelineStatus {
  const candidates = TIMELINE_COLUMNS.map((col, index) => ({
    id: col.id,
    dist: Math.abs(x - computeColumnX(index, frameCenterX)),
  }));
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0]?.id ?? 'in_progress';
}

async function upsertMiroItemMap(
  supabase: ReturnType<typeof createClient>,
  args: {
    boardId: string;
    projectId: string;
    itemType: string;
    miroItemId: string;
    fieldKey?: string | null;
    versionNumber?: number | null;
  }
) {
  const { error } = await supabase.from('miro_item_map').upsert(
    {
      board_id: args.boardId,
      project_id: args.projectId,
      item_type: args.itemType,
      miro_item_id: args.miroItemId,
      field_key: args.fieldKey ?? null,
      version_number: args.versionNumber ?? null,
    },
    { onConflict: 'board_id,miro_item_id' }
  );

  if (error) {
    throw new Error(`miro_item_map_upsert_failed:${error.message}`);
  }
}

async function getMappedItem(
  supabase: ReturnType<typeof createClient>,
  boardId: string,
  miroItemId: string
) {
  const { data, error } = await supabase
    .from('miro_item_map')
    .select('project_id, item_type, field_key, version_number')
    .eq('board_id', boardId)
    .eq('miro_item_id', miroItemId)
    .maybeSingle();

  if (error) throw new Error(`miro_item_map_lookup_failed:${error.message}`);
  return data;
}

async function getProjectMappingItems(
  supabase: ReturnType<typeof createClient>,
  projectId: string
) {
  const { data, error } = await supabase
    .from('miro_item_map')
    .select('miro_item_id, item_type, field_key, version_number')
    .eq('project_id', projectId);
  if (error) throw new Error(`miro_item_map_list_failed:${error.message}`);
  return data ?? [];
}

async function syncProjectRow(args: {
  supabase: ReturnType<typeof createClient>;
  accessToken: string;
  boardId: string;
  project: {
    id: string;
    name: string;
    status: string;
    briefing?: Record<string, unknown> | null;
  };
  frames: MiroFrame[];
  timelineFrame: MiroFrame | null;
}) {
  const { supabase, accessToken, boardId, project, frames, timelineFrame } = args;
  const mappingItems = await getProjectMappingItems(supabase, project.id);

  const briefingMap = mappingItems.find((item) => item.item_type === 'briefing_frame');
  const versionMap = mappingItems.find((item) => item.item_type === 'version_frame' && item.version_number === 1);
  const briefingFields = mappingItems.filter((item) => item.item_type === 'briefing_field');

  const normalizedName = project.name.trim().toLowerCase();
  let briefingFrameId = briefingMap?.miro_item_id ?? null;
  let versionFrameId = versionMap?.miro_item_id ?? null;

  if (!briefingFrameId) {
    const existingBriefing = frames.find((f) => {
      const title = f.data?.title?.toLowerCase() ?? '';
      return title.includes('briefing') && title.startsWith(normalizedName);
    });
    if (existingBriefing) briefingFrameId = existingBriefing.id;
  }

  if (!versionFrameId) {
    const existingVersion = frames.find((f) => {
      const title = f.data?.title?.toLowerCase() ?? '';
      return title.includes('version') && title.startsWith(normalizedName);
    });
    if (existingVersion) versionFrameId = existingVersion.id;
  }

  if (briefingFrameId && !briefingMap) {
    await upsertMiroItemMap(supabase, {
      boardId,
      projectId: project.id,
      itemType: 'briefing_frame',
      miroItemId: briefingFrameId,
    });
  }

  if (versionFrameId && !versionMap) {
    await upsertMiroItemMap(supabase, {
      boardId,
      projectId: project.id,
      itemType: 'version_frame',
      miroItemId: versionFrameId,
      versionNumber: 1,
    });
  }

  const frameWidth = timelineFrame?.geometry?.width ?? TIMELINE.FRAME_WIDTH;
  const frameHeight = timelineFrame?.geometry?.height ?? TIMELINE.FRAME_HEIGHT;
  const timelineCenterX = timelineFrame?.position?.x ?? 0;
  const timelineCenterY = timelineFrame?.position?.y ?? 0;
  const timelineRightEdge = timelineCenterX + frameWidth / 2;
  const timelineTopY = timelineCenterY - frameHeight / 2;

  const baseX = timelineRightEdge + TIMELINE.GAP_TO_PROJECTS + FRAME.WIDTH / 2;

  let nextY = timelineTopY + FRAME.HEIGHT / 2;
  const briefingFrames = frames.filter((f) => (f.data?.title ?? '').includes('BRIEFING'));
  if (briefingFrames.length > 0) {
    const lowestBottom = Math.max(
      ...briefingFrames.map((f) => {
        const height = f.geometry?.height ?? FRAME.HEIGHT;
        const centerY = f.position?.y ?? 0;
        return centerY + height / 2;
      })
    );
    nextY = lowestBottom + FRAME.ROW_GAP + FRAME.HEIGHT / 2;
  }

  if (!briefingFrameId) {
    if (briefingFrames.length === 0) {
      await miroCreateText(accessToken, boardId, {
        content: '<b>Projects Overview</b>',
        x: baseX,
        y: nextY - 40,
        width: 220,
        style: { fontSize: '18', textAlign: 'left' },
      });
    }

    const existingCount = briefingFrames.length;
    const now = new Date();
    const projectTag = `[PROJ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(existingCount + 1).padStart(3, '0')}]`;

    const briefingRes = await miroCreateFrame(accessToken, boardId, {
      title: `${project.name} - BRIEFING ${projectTag}`,
      x: baseX,
      y: nextY,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
    });

    const versionRes = await miroCreateFrame(accessToken, boardId, {
      title: `${project.name} - VERSION 1 ${projectTag}`,
      x: baseX + FRAME.WIDTH + FRAME.GAP,
      y: nextY,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
    });

    briefingFrameId = briefingRes.data.id;
    versionFrameId = versionRes.data.id;

    await upsertMiroItemMap(supabase, {
      boardId,
      projectId: project.id,
      itemType: 'briefing_frame',
      miroItemId: briefingFrameId,
    });

    await upsertMiroItemMap(supabase, {
      boardId,
      projectId: project.id,
      itemType: 'version_frame',
      miroItemId: versionFrameId,
      versionNumber: 1,
    });

    const briefing = (project.briefing ?? {}) as Record<string, unknown>;
    const top = nextY - FRAME.HEIGHT / 2;
    const headerY = top + BRIEFING.PADDING + BRIEFING.HEADER_HEIGHT / 2;

    await miroCreateShape(accessToken, boardId, {
      shape: 'rectangle',
      content: `<p><b>${escapeHtml(project.name.toUpperCase())} - BRIEFING</b></p>`,
      x: baseX,
      y: headerY,
      width: FRAME.WIDTH - BRIEFING.PADDING * 2,
      height: BRIEFING.HEADER_HEIGHT,
      style: {
        fillColor: '#000000',
        borderColor: 'transparent',
        borderWidth: 0,
        fontColor: '#FFFFFF',
        fontSize: 11,
      },
    });

    const { COLS, CELL_WIDTH, CELL_HEIGHT, CELL_GAP } = BRIEFING.FORM;
    const gridWidth = COLS * CELL_WIDTH + (COLS - 1) * CELL_GAP;
    const gridStartX = baseX - gridWidth / 2 + CELL_WIDTH / 2;
    const formStartY = headerY + BRIEFING.HEADER_HEIGHT / 2 + 20;

    for (const field of BRIEFING_FIELDS) {
      const cellX = gridStartX + field.col * (CELL_WIDTH + CELL_GAP);
      const cellY = formStartY + field.row * (CELL_HEIGHT + CELL_GAP) + CELL_HEIGHT / 2;
      const rawValue = briefing[field.key];
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      const hasValue = Boolean(value);
      const display = hasValue ? escapeHtml(value) : 'NEEDS ATTENTION!';

      await miroCreateText(accessToken, boardId, {
        content: `<b>${escapeHtml(field.label)}</b>`,
        x: cellX,
        y: cellY - CELL_HEIGHT / 2 - 10,
        width: CELL_WIDTH,
        style: { color: '#6B7280', fontSize: '9', textAlign: 'left' },
      });

      const shapeRes = await miroCreateShape(accessToken, boardId, {
        shape: 'rectangle',
        content: hasValue ? `<p>${display}</p>` : `<p><b>${display}</b></p>`,
        x: cellX,
        y: cellY,
        width: CELL_WIDTH,
        height: CELL_HEIGHT - 10,
        style: {
          fillColor: hasValue ? '#FFFFFF' : '#FEE2E2',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          fontColor: hasValue ? '#000000' : '#EF4444',
          fontSize: 10,
          textAlign: hasValue ? 'left' : 'center',
        },
      });

      await upsertMiroItemMap(supabase, {
        boardId,
        projectId: project.id,
        itemType: 'briefing_field',
        miroItemId: shapeRes.data.id,
        fieldKey: field.key,
      });
    }

    await miroCreateText(accessToken, boardId, {
      content: '<b>VERSION 1</b>',
      x: baseX + FRAME.WIDTH + FRAME.GAP,
      y: headerY,
      width: 200,
      style: { fontSize: '12', textAlign: 'center' },
    });
  } else if (briefingFields.length > 0) {
    const briefing = (project.briefing ?? {}) as Record<string, unknown>;
    for (const field of briefingFields) {
      const rawValue = briefing[field.field_key ?? ''] ?? '';
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      const hasValue = Boolean(value);
      const display = hasValue ? escapeHtml(value) : 'NEEDS ATTENTION!';
      try {
        await miroUpdateShape(accessToken, boardId, field.miro_item_id, {
          content: hasValue ? `<p>${display}</p>` : `<p><b>${display}</b></p>`,
          style: {
            fillColor: hasValue ? '#FFFFFF' : '#FEE2E2',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            fontColor: hasValue ? '#000000' : '#EF4444',
            fontSize: 10,
            textAlign: hasValue ? 'left' : 'center',
          },
        });
      } catch {
        // Best-effort updates; ignore missing items.
      }
    }
  }
}

function normalizeClaimResult(raw: unknown): SyncJob | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as unknown;
    if (!first) return null;
    const asJob = first as Partial<SyncJob>;
    return asJob.id ? (first as SyncJob) : null;
  }
  const asJob = raw as Partial<SyncJob>;
  return asJob.id ? (raw as SyncJob) : null;
}

async function rpcOrThrow<T>(client: ReturnType<typeof createClient>, fn: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, { status: 405, headers: corsHeaders() });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const miroClientId = Deno.env.get('MIRO_CLIENT_ID') ?? '';
  const miroClientSecret = Deno.env.get('MIRO_CLIENT_SECRET') ?? '';
  const miroEncryptionKey = Deno.env.get('MIRO_TOKEN_ENCRYPTION_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, { status: 401, headers: corsHeaders() });
  }

  // Verify caller is an admin (RBAC at the trust boundary)
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData?.user) {
    return json({ error: 'invalid_token', details: authErr?.message }, { status: 401, headers: corsHeaders() });
  }

  const { data: publicUser, error: publicUserErr } = await userClient
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (publicUserErr || !publicUser) {
    return json({ error: 'public_user_not_found' }, { status: 403, headers: corsHeaders() });
  }
  if (publicUser.role !== 'admin') {
    return json({ error: 'forbidden' }, { status: 403, headers: corsHeaders() });
  }

  let body: { miroAccessToken?: string; maxJobs?: number; jobId?: string } = {};
  try {
    body = (await req.json().catch(() => ({}))) as { miroAccessToken?: string; maxJobs?: number; jobId?: string };
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  const requestMiroToken = safeString(body.miroAccessToken);
  const requestJobId = safeString(body.jobId);
  if (requestJobId && !isUuid(requestJobId)) {
    return json({ error: 'invalid_job_id' }, { status: 400, headers: corsHeaders() });
  }

  const maxJobs = requestJobId ? 1 : Math.max(1, Math.min(10, Number(body.maxJobs ?? 1)));

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const workerId = `edge:${crypto.randomUUID()}`;

  const results: Array<{
    jobId: string;
    type: SyncJob['job_type'];
    projectId: string | null;
    boardId: string | null;
    result: 'succeeded' | 'requeued' | 'failed' | 'skipped';
    details?: string;
  }> = [];

  for (let i = 0; i < maxJobs; i++) {
    const { data: job, error: claimError } = requestJobId
      ? await supabase.rpc('claim_sync_job_by_id', { p_job_id: requestJobId, p_worker_id: workerId })
      : await supabase.rpc('claim_next_sync_job', { p_worker_id: workerId });

    if (claimError) {
      return json({ error: 'claim_failed', details: claimError.message }, { status: 500, headers: corsHeaders() });
    }
    const typedJob = normalizeClaimResult(job);
    if (!typedJob) break;

    try {
      if (typedJob.job_type === 'project_sync') {
        // Load project (source of truth)
        if (!typedJob.project_id) {
          const msg = 'project_sync_requires_project_id';
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId: typedJob.board_id, result: 'failed', details: msg });
          continue;
        }

        const { data: project, error: projErr } = await supabase
          .from('projects')
          .select('id, name, status, priority, due_date, due_date_approved, miro_board_id, miro_card_id, sync_status, briefing')
          .eq('id', typedJob.project_id)
          .maybeSingle();
        if (projErr || !project) {
          const msg = `project_not_found:${projErr?.message ?? 'missing'}`;
          await supabase.rpc('complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: typedJob.project_id, boardId: typedJob.board_id, result: 'failed', details: msg });
          continue;
        }

        const boardId = typedJob.board_id ?? (project.miro_board_id as string | null);
        if (!boardId) {
          // No board: not required
          await supabase.from('projects').update({ sync_status: 'not_required', last_sync_attempt: nowIso(), last_synced_at: nowIso() }).eq('id', project.id);
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId: null, result: 'skipped', details: 'no_board_id' });
          continue;
        }

        const jobToken = safeString((typedJob.payload ?? ({} as Record<string, unknown>)).miroAccessToken);
        let miroAccessToken = jobToken ?? requestMiroToken;
        if (!miroAccessToken && boardId && miroClientId && miroClientSecret && miroEncryptionKey) {
          try {
            const tokenRes = await getMiroAccessToken(supabase, {
              boardId,
              clientId: miroClientId,
              clientSecret: miroClientSecret,
              encryptionKey: miroEncryptionKey,
            });
            miroAccessToken = tokenRes.accessToken;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const delay = retryDelaySeconds(typedJob.attempt_count);
            await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
            continue;
          }
        }
        if (!miroAccessToken) {
          const msg = 'missing_miro_access_token';
          const delay = retryDelaySeconds(typedJob.attempt_count);
          await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
          continue;
        }

        // Update project to syncing
        await supabase.from('projects').update({ sync_status: 'syncing', last_sync_attempt: nowIso(), sync_error_message: null }).eq('id', project.id);

        const syncLogId = await rpcOrThrow<string | null>(supabase, 'create_sync_log', { p_project_id: project.id, p_operation: 'sync' });

        // Miro connectivity check
        const boardRes = await miroGetBoard(miroAccessToken, boardId);
        if (!boardRes.ok) {
          const msg = `miro_board_unreachable:${boardRes.status}:${boardRes.message}`;
          if (syncLogId) await rpcOrThrow(supabase, 'complete_sync_log', { p_sync_id: syncLogId, p_status: 'error', p_error_message: msg, p_error_category: 'miro_api_error' });
          await supabase.from('projects').update({ sync_status: 'sync_error', sync_error_message: msg, last_sync_attempt: nowIso() }).eq('id', project.id);
          if (!shouldRetryMiroStatus(boardRes.status)) {
            await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'failed', details: msg });
          } else {
            const delay = retryDelaySeconds(typedJob.attempt_count);
            await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
          }
          continue;
        }

        // Ensure timeline frame exists (best-effort)
        const framesRes = await miroListFrames(miroAccessToken, boardId);
        const frames = framesRes.ok ? (framesRes.data.data ?? []) : [];
        const timeline = framesRes.ok ? findTimelineFrame(frames) : null;
        if (framesRes.ok && !timeline) {
          await miroCreateFrame(miroAccessToken, boardId, {
            title: 'MASTER TIMELINE',
            x: 0,
            y: 0,
            width: TIMELINE.FRAME_WIDTH,
            height: TIMELINE.FRAME_HEIGHT,
          });
        }

        const status = mapProjectToTimelineStatus({
          status: project.status as string,
          due_date: project.due_date as string | null,
          due_date_approved: project.due_date_approved as boolean | null,
        });
        const colIndex = Math.max(0, TIMELINE_COLUMNS.findIndex((c) => c.id === status));

        const cardsRes = await miroListCards(miroAccessToken, boardId);
        if (!cardsRes.ok) {
          const msg = `miro_cards_list_failed:${cardsRes.status}:${cardsRes.message}`;
          if (syncLogId) await rpcOrThrow(supabase, 'complete_sync_log', { p_sync_id: syncLogId, p_status: 'error', p_error_message: msg, p_error_category: 'miro_api_error' });
          await supabase.from('projects').update({ sync_status: 'sync_error', sync_error_message: msg, last_sync_attempt: nowIso() }).eq('id', project.id);
          if (!shouldRetryMiroStatus(cardsRes.status)) {
            await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'failed', details: msg });
          } else {
            const delay = retryDelaySeconds(typedJob.attempt_count);
            await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
          }
          continue;
        }

        const cards = cardsRes.data.data ?? [];
        const marker = `projectId:${project.id}`;
        const existingByMarker = cards.find((c) => extractCardDescription(c).includes(marker));

        const rawName = String(project.name ?? 'Project');
        const cardTitle = rawName.replace(/[\r\n]+/g, ' ').trim().slice(0, 80) || 'Project';
        const description = marker;
        const dueDate = normalizeDateToYYYYMMDD(project.due_date as string | null);

        const frameCenterX = timeline?.position?.x ?? 0;
        const frameCenterY = timeline?.position?.y ?? 0;
        const targetX = computeColumnX(colIndex, frameCenterX);
        let targetY = computeFirstCardY(frameCenterY);

        // If updating an existing card in the same column, keep its Y.
        if (existingByMarker) {
          const pos = extractCardPosition(existingByMarker);
          const inSameColumn = Math.abs(pos.x - targetX) < TIMELINE.COLUMN_WIDTH / 2;
          targetY = inSameColumn ? pos.y : targetY;
        } else {
          // Place below the lowest card in that column region.
          const sameColumnCards = cards.filter((c) => {
            const pos = extractCardPosition(c);
            return Math.abs(pos.x - targetX) < TIMELINE.COLUMN_WIDTH / 2;
          });
          const bottoms = sameColumnCards.map((c) => {
            const pos = extractCardPosition(c);
            const h = Number(c.geometry?.height ?? TIMELINE.CARD_HEIGHT);
            return pos.y + h / 2;
          });
          const maxBottom = bottoms.length ? Math.max(...bottoms) : null;
          if (maxBottom !== null) {
            targetY = maxBottom + TIMELINE.CARD_GAP + TIMELINE.CARD_HEIGHT / 2;
          }
        }

        let cardId: string | null = (project.miro_card_id as string | null) ?? null;
        let miroOp: 'created' | 'updated' = 'updated';

        // Prefer updating by known cardId, fallback to marker match, else create.
        if (!cardId && existingByMarker) cardId = existingByMarker.id;

        if (cardId) {
          const upd = await miroUpdateCard(miroAccessToken, boardId, cardId, {
            title: cardTitle,
            description,
            x: targetX,
            y: targetY,
            dueDate,
          });
          if (!upd.ok) {
            // If stale id, create new.
            const create = await miroCreateCard(miroAccessToken, boardId, {
              title: cardTitle,
              description,
              x: targetX,
              y: targetY,
              width: TIMELINE.CARD_WIDTH,
              dueDate,
            });
            if (!create.ok) {
              const msg = `miro_card_write_failed:${upd.status}:${upd.message}:${create.status}:${create.message}`;
              if (syncLogId) await rpcOrThrow(supabase, 'complete_sync_log', { p_sync_id: syncLogId, p_status: 'error', p_error_message: msg, p_error_category: 'miro_api_error' });
              await supabase.from('projects').update({ sync_status: 'sync_error', sync_error_message: msg, last_sync_attempt: nowIso() }).eq('id', project.id);
              const retryable = shouldRetryMiroStatus(upd.status) || shouldRetryMiroStatus(create.status);
              if (!retryable) {
                await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
                results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'failed', details: msg });
              } else {
                const delay = retryDelaySeconds(typedJob.attempt_count);
                await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
                results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
              }
              continue;
            }
            cardId = create.data.id;
            miroOp = 'created';
          }
        } else {
          const create = await miroCreateCard(miroAccessToken, boardId, {
            title: cardTitle,
            description,
            x: targetX,
            y: targetY,
            width: TIMELINE.CARD_WIDTH,
            dueDate,
          });
          if (!create.ok) {
            const msg = `miro_card_create_failed:${create.status}:${create.message}`;
            if (syncLogId) await rpcOrThrow(supabase, 'complete_sync_log', { p_sync_id: syncLogId, p_status: 'error', p_error_message: msg, p_error_category: 'miro_api_error' });
            await supabase.from('projects').update({ sync_status: 'sync_error', sync_error_message: msg, last_sync_attempt: nowIso() }).eq('id', project.id);
            if (!shouldRetryMiroStatus(create.status)) {
              await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
              results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'failed', details: msg });
            } else {
              const delay = retryDelaySeconds(typedJob.attempt_count);
              await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
              results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
            }
            continue;
          }
          cardId = create.data.id;
          miroOp = 'created';
        }

        await upsertMiroItemMap(supabase, {
          boardId,
          projectId: project.id as string,
          itemType: 'timeline_card',
          miroItemId: cardId,
        });

        try {
          await syncProjectRow({
            supabase,
            accessToken: miroAccessToken,
            boardId,
            project: {
              id: project.id as string,
              name: project.name as string,
              status: project.status as string,
              briefing: (project.briefing as Record<string, unknown> | null) ?? {},
            },
            frames,
            timelineFrame: timeline,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const msg = `miro_project_row_failed:${message}`;
          if (syncLogId) await rpcOrThrow(supabase, 'complete_sync_log', { p_sync_id: syncLogId, p_status: 'error', p_error_message: msg, p_error_category: 'miro_api_error' });
          await supabase.from('projects').update({ sync_status: 'sync_error', sync_error_message: msg, last_sync_attempt: nowIso() }).eq('id', project.id);
          const delay = retryDelaySeconds(typedJob.attempt_count);
          await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'requeued', details: msg });
          continue;
        }

        await supabase
          .from('projects')
          .update({
            miro_board_id: boardId,
            miro_card_id: cardId,
            sync_status: 'synced',
            last_synced_at: nowIso(),
            last_sync_attempt: nowIso(),
            last_miro_outbound_at: nowIso(),
            sync_error_message: null,
            sync_retry_count: 0,
          })
          .eq('id', project.id);

        if (syncLogId) {
          const created = miroOp === 'created' ? [{ id: cardId, type: 'card' }] : [];
          const updated = miroOp === 'updated' ? [{ id: cardId, type: 'card' }] : [];
          await rpcOrThrow(supabase, 'complete_sync_log', {
            p_sync_id: syncLogId,
            p_status: 'success',
            p_miro_items_created: created,
            p_miro_items_updated: updated,
            p_miro_items_deleted: [],
            p_error_message: null,
            p_error_category: null,
          });
        }

        await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
        results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: project.id, boardId, result: 'succeeded', details: `miro:${miroOp}:${cardId}` });
        continue;
      }

      if (typedJob.job_type === 'miro_item_sync') {
        const boardId = typedJob.board_id;
        if (!boardId) {
          const msg = 'miro_item_sync_missing_board_id';
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: false, p_error: msg });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId: null, result: 'failed', details: msg });
          continue;
        }

        if (!miroClientId || !miroClientSecret || !miroEncryptionKey) {
          const msg = 'missing_miro_oauth_env';
          const delay = retryDelaySeconds(typedJob.attempt_count);
          await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId, result: 'requeued', details: msg });
          continue;
        }

        let miroAccessToken: string;
        try {
          const tokenRes = await getMiroAccessToken(supabase, {
            boardId,
            clientId: miroClientId,
            clientSecret: miroClientSecret,
            encryptionKey: miroEncryptionKey,
          });
          miroAccessToken = tokenRes.accessToken;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const delay = retryDelaySeconds(typedJob.attempt_count);
          await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId, result: 'requeued', details: msg });
          continue;
        }

        const payload = (typedJob.payload ?? {}) as Record<string, unknown>;
        const itemId = safeString(payload.itemId ?? payload.item_id ?? payload.itemID ?? null);
        const itemType = safeString(payload.itemType ?? payload.item_type ?? null);
        const eventType = safeString(payload.eventType ?? payload.event_type ?? payload.type ?? null);
        const eventAt = safeString(payload.eventAt ?? payload.event_time ?? payload.eventTime ?? null) ?? nowIso();

        if (!itemId) {
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: 'missing_item_id' });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId, result: 'skipped', details: 'missing_item_id' });
          continue;
        }

        const isDeleteEvent = eventType?.includes('delete') ?? false;
        let itemDetails: Record<string, unknown> | null = null;

        if (!isDeleteEvent) {
          const res = await miroGetItem(miroAccessToken, boardId, itemId);
          if (!res.ok && res.status === 404) {
            itemDetails = null;
          } else if (!res.ok) {
            const msg = `miro_item_fetch_failed:${res.status}:${res.message}`;
            const delay = retryDelaySeconds(typedJob.attempt_count);
            await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId, result: 'requeued', details: msg });
            continue;
          } else {
            itemDetails = res.data;
          }
        }

        const itemData = (itemDetails?.data ?? {}) as Record<string, unknown>;
        const itemPos = (itemDetails?.position ?? {}) as Record<string, unknown>;
        const description = typeof itemData.description === 'string' ? itemData.description : '';
        const inferredProjectId = extractProjectIdFromDescription(description);

        let projectId = inferredProjectId;
        let mappedItem: { project_id: string; item_type: string; field_key: string | null } | null = null;
        if (!projectId) {
          try {
            const mapping = await getMappedItem(supabase, boardId, itemId);
            if (mapping) {
              projectId = mapping.project_id as string;
              mappedItem = {
                project_id: mapping.project_id as string,
                item_type: mapping.item_type as string,
                field_key: mapping.field_key as string | null,
              };
            }
          } catch {
            // ignore mapping lookup failures
          }
        }

        if (!projectId) {
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: null, boardId, result: 'skipped', details: 'unknown_item' });
          continue;
        }

        const { data: projectRow, error: projectErr } = await supabase
          .from('projects')
          .select('id, status, priority, due_date, briefing, last_miro_outbound_at')
          .eq('id', projectId)
          .maybeSingle();

        if (projectErr || !projectRow) {
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: 'project_not_found' });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId, boardId, result: 'skipped', details: 'project_not_found' });
          continue;
        }

        const outboundAt = projectRow.last_miro_outbound_at as string | null;
        if (outboundAt) {
          const outboundMs = new Date(outboundAt).getTime();
          const eventMs = new Date(eventAt).getTime();
          if (!Number.isNaN(outboundMs) && !Number.isNaN(eventMs) && eventMs <= outboundMs + 10000) {
            await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
            results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId, boardId, result: 'skipped', details: 'echo_event' });
            continue;
          }
        }

        if (isDeleteEvent || !itemDetails) {
          await supabase
            .from('projects')
            .update({ miro_card_id: null, sync_status: 'pending', sync_error_message: 'Miro item deleted', last_miro_inbound_at: nowIso() })
            .eq('id', projectId);
          await supabase.from('miro_item_map').delete().eq('board_id', boardId).eq('miro_item_id', itemId);
          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId, boardId, result: 'succeeded', details: 'deleted_item_handled' });
          continue;
        }

        const inferredType = itemType ?? (itemDetails?.type as string | undefined) ?? '';
        if (inferredType === 'card') {
          const x = Number(itemPos.x ?? 0);
          const timelineFrameRes = await miroListFrames(miroAccessToken, boardId);
          const timelineFrame = timelineFrameRes.ok ? findTimelineFrame(timelineFrameRes.data.data ?? []) : null;
          const centerX = timelineFrame?.position?.x ?? 0;
          const status = inferStatusFromCardX(x, centerX);
          const dueDateRaw = typeof itemData.dueDate === 'string' ? itemData.dueDate : null;
          const dueDateIso = normalizeDueDateToIso(dueDateRaw);

          await supabase
            .from('projects')
            .update({
              status,
              due_date: dueDateIso,
              due_date_approved: true,
              miro_card_id: itemId,
              sync_status: 'synced',
              sync_error_message: null,
              last_miro_inbound_at: nowIso(),
            })
            .eq('id', projectId);

          try {
            await upsertMiroItemMap(supabase, {
              boardId,
              projectId,
              itemType: 'timeline_card',
              miroItemId: itemId,
            });
          } catch {
            // Mapping is best-effort for inbound updates.
          }

          await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
          results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId, boardId, result: 'succeeded', details: 'card_update' });
          continue;
        }

        const mapping = mappedItem ?? (await getMappedItem(supabase, boardId, itemId));
        if (mapping && mapping.item_type === 'briefing_field') {
          const content = stripHtml(typeof itemData.content === 'string' ? itemData.content : '');
          const briefing = (projectRow.briefing ?? {}) as Record<string, unknown>;
          if (mapping.field_key) briefing[mapping.field_key] = content || null;

          await supabase
            .from('projects')
            .update({ briefing, last_miro_inbound_at: nowIso() })
            .eq('id', projectId);
        }

        await rpcOrThrow(supabase, 'complete_sync_job', { p_job_id: typedJob.id, p_success: true, p_error: null });
        results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId, boardId, result: 'succeeded', details: 'item_update' });
        continue;
      }

      // master_board_sync not yet implemented
      const msg = `sync-worker: job ${typedJob.job_type} not implemented`;
      const delay = retryDelaySeconds(typedJob.attempt_count);
      await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: msg, p_retry_delay_seconds: delay });
      results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: typedJob.project_id, boardId: typedJob.board_id, result: 'requeued', details: msg });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const delay = retryDelaySeconds(typedJob.attempt_count);
      try {
        await rpcOrThrow(supabase, 'fail_sync_job', { p_job_id: typedJob.id, p_error: message, p_retry_delay_seconds: delay });
      } catch (rpcErr) {
        return json({ error: 'job_failure_update_failed', details: rpcErr instanceof Error ? rpcErr.message : String(rpcErr) }, { status: 500, headers: corsHeaders() });
      }
      results.push({ jobId: typedJob.id, type: typedJob.job_type, projectId: typedJob.project_id, boardId: typedJob.board_id, result: 'requeued', details: message });
    }
  }

  return json(
    {
      ok: true,
      workerId,
      processed: results.length,
      results,
    },
    { status: 200, headers: corsHeaders() }
  );
});
