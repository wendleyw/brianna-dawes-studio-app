# Miro ↔ Supabase Sync (Bidirectional)

## Overview
- **Supabase → Miro**: `sync-worker` processes `project_sync` jobs and updates timeline + briefing + versions via Miro REST API.
- **Miro → Supabase**: `miro-webhook` receives Miro item events, enqueues `miro_item_sync`, and `sync-worker` applies DB updates.

## Required Secrets (Supabase Edge)
Set these in Supabase project secrets (do NOT commit):

- `MIRO_CLIENT_ID`
- `MIRO_CLIENT_SECRET`
- `MIRO_REDIRECT_URI` (ex: `https://<app-domain>/auth/miro/oauth/callback`)
- `MIRO_WEBHOOK_SECRET`
- `MIRO_TOKEN_ENCRYPTION_KEY` (32 bytes, base64 or 64-char hex)

## OAuth Connect (per board)
1) Open **Admin → Developer Tools** inside a Miro board.
2) Click **Connect Miro OAuth**.
3) Approve access in Miro.
4) Callback will store refresh tokens in `public.miro_oauth_tokens` (encrypted).

## Webhook Registration
Create a webhook pointing to:

`https://<supabase-project>.supabase.co/functions/v1/miro-webhook`

Use the same `MIRO_WEBHOOK_SECRET` as the signing secret.

## Notes
- Timeline cards include `projectId:<uuid>` in description for safe matching.
- Briefing fields are mapped via `miro_item_map` to enable inbound updates.
- Loop protection uses `projects.last_miro_outbound_at` to ignore echo events.
