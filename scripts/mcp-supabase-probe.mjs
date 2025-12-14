import fs from 'node:fs';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function parseDotenv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getProjectRefFromSupabaseUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname; // <ref>.supabase.co
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

async function main() {
  const repoRoot = process.cwd();

  const localEnv = parseDotenv(path.join(repoRoot, '.env.local'));
  const mcpEnv = parseDotenv(path.join(repoRoot, '.env.mcp.local'));

  const accessToken = mcpEnv.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN || '';
  const projectRef =
    mcpEnv.SUPABASE_PROJECT_REF ||
    process.env.SUPABASE_PROJECT_REF ||
    getProjectRefFromSupabaseUrl(mcpEnv.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL || '') ||
    '';

  if (!accessToken) {
    throw new Error(
      'Missing SUPABASE_ACCESS_TOKEN. Create `.env.mcp.local` (gitignored) with SUPABASE_ACCESS_TOKEN=...'
    );
  }
  if (!projectRef) {
    throw new Error(
      'Missing SUPABASE_PROJECT_REF. Set it in `.env.mcp.local` or ensure `.env.local` contains VITE_SUPABASE_URL.'
    );
  }

  const client = new Client({ name: 'bd-studio-probe', version: '1.0.0' });

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase', '--project-ref', projectRef, '--read-only'],
    env: {
      SUPABASE_ACCESS_TOKEN: accessToken,
    },
    stderr: 'inherit',
  });

  await client.connect(transport);

  const tools = await client.listTools();
  const resources = await client.listResources();
  const templates = await client.listResourceTemplates();

  console.log(JSON.stringify({ tools, resources, templates }, null, 2));

  await transport.close();
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

