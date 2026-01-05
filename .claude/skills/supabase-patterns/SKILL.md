---
name: supabase-patterns
description: Use when working with Supabase database queries, RLS policies, Edge Functions, migrations, real-time subscriptions, or storage. Ensures best practices for backend operations and data security.
allowed-tools: Read, Edit, Grep, Glob, Bash, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# Supabase Patterns Skill

## Overview

This skill provides guidance for working with Supabase in the project management system, covering database operations, RLS policies, Edge Functions, migrations, real-time subscriptions, and file storage.

---

## Database Architecture

### Core Tables

**Location**: Database schema (see migrations in `supabase/migrations/`)

1. **users**
   - `id` (uuid, primary key)
   - `email` (text, unique)
   - `role` (enum: `admin`, `designer`, `client`)
   - `full_name` (text)
   - `created_at` (timestamptz)

2. **projects**
   - `id` (uuid, primary key)
   - `title` (text)
   - `description` (text, nullable)
   - `status` (enum: `draft`, `in_progress`, `review`, `done`, `archived`)
   - `client_id` (uuid, foreign key → users)
   - `designer_id` (uuid, foreign key → users, nullable)
   - `miro_board_id` (text, nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

3. **deliverables**
   - `id` (uuid, primary key)
   - `project_id` (uuid, foreign key → projects)
   - `title` (text)
   - `status` (enum: `pending`, `wip`, `review`, `approved`)
   - `position` (integer)
   - `miro_item_id` (text, nullable)
   - `created_at` (timestamptz)

4. **project_updates**
   - `id` (uuid, primary key)
   - `project_id` (uuid, foreign key → projects)
   - `user_id` (uuid, foreign key → users)
   - `type` (text: `status_change`, `comment`, `file_upload`)
   - `payload` (jsonb)
   - `created_at` (timestamptz)

5. **files**
   - `id` (uuid, primary key)
   - `project_id` (uuid, foreign key → projects, nullable)
   - `deliverable_id` (uuid, foreign key → deliverables, nullable)
   - `file_name` (text)
   - `file_path` (text)
   - `file_size` (bigint)
   - `mime_type` (text)
   - `uploaded_by` (uuid, foreign key → users)
   - `created_at` (timestamptz)

6. **audit_logs**
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key → users)
   - `action` (text)
   - `entity_type` (text)
   - `entity_id` (uuid)
   - `metadata` (jsonb)
   - `created_at` (timestamptz)

---

## Row-Level Security (RLS)

### Critical: RLS is Enabled on All Tables

All tables have RLS enabled. Policies enforce access control based on user role.

### RLS Policy Patterns

#### Admin Role: Full Access

```sql
-- Admins can read all projects
CREATE POLICY "Admins can read all projects"
ON projects FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Admins can update all projects
CREATE POLICY "Admins can update all projects"
ON projects FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
```

#### Designer Role: Assigned Projects Only

```sql
-- Designers can read assigned projects
CREATE POLICY "Designers can read assigned projects"
ON projects FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'designer'
  AND designer_id = auth.uid()
);

-- Designers can update assigned projects
CREATE POLICY "Designers can update assigned projects"
ON projects FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'designer'
  AND designer_id = auth.uid()
);
```

#### Client Role: Own Projects Only

```sql
-- Clients can read their own projects
CREATE POLICY "Clients can read own projects"
ON projects FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'client'
  AND client_id = auth.uid()
);

-- Clients can NOT update projects (read-only)
-- No UPDATE policy for clients
```

### Testing RLS Policies

```typescript
// ✅ CORRECT: RLS is automatically enforced
const { data, error } = await supabase
  .from('projects')
  .select('*');

// Returns only projects user has access to based on role
// - Admin: All projects
// - Designer: Assigned projects
// - Client: Own projects

// ❌ WRONG: Don't try to manually filter by role
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('client_id', userId); // Don't do this, RLS handles it!
```

### Bypassing RLS (Service Role Key)

**Only use in Edge Functions, never in client code!**

```typescript
// Edge Function with service role key
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // ⚠️ Bypasses RLS
);

// Admin client can access all data regardless of RLS
const { data } = await supabaseAdmin
  .from('projects')
  .select('*'); // Returns ALL projects
```

---

## Supabase Client Initialization

### Client-Side (Browser)

**Location**: `src/shared/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// RLS is enforced
// Uses authenticated user's JWT token
```

### Server-Side (Edge Functions)

**Location**: `supabase/functions/_shared/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// For RLS-enforced operations
export const createSupabaseClient = (authToken: string) => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    },
  );
};

// For admin operations (bypasses RLS)
export const createSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
};
```

---

## Query Patterns

### Pattern 1: Simple Select

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*');

if (error) {
  logger.error('Failed to fetch projects', { error });
  return [];
}

return data ?? [];
```

### Pattern 2: Select with Filters

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'in_progress')
  .order('created_at', { ascending: false });

if (error) {
  logger.error('Failed to fetch projects', { error });
  return [];
}

return data ?? [];
```

### Pattern 3: Select Single Record

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single(); // ✅ Returns single object or null

if (error) {
  logger.error('Project not found', { projectId, error });
  return null;
}

return data;
```

### Pattern 4: Select with Relations

```typescript
const { data, error } = await supabase
  .from('projects')
  .select(`
    *,
    client:client_id (
      id,
      full_name,
      email
    ),
    designer:designer_id (
      id,
      full_name
    ),
    deliverables (
      id,
      title,
      status
    )
  `)
  .eq('id', projectId)
  .single();

if (error || !data) return null;

// data has nested relations
console.log(data.client.full_name);
console.log(data.deliverables.length);
```

### Pattern 5: Insert

```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    title: 'New Project',
    description: 'Project description',
    status: 'draft',
    client_id: clientId,
  })
  .select()
  .single();

if (error) {
  logger.error('Failed to create project', { error });
  throw new Error('Failed to create project');
}

return data;
```

### Pattern 6: Update

```typescript
const { data, error } = await supabase
  .from('projects')
  .update({
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  })
  .eq('id', projectId)
  .select()
  .single();

if (error) {
  logger.error('Failed to update project', { projectId, error });
  return null;
}

return data;
```

### Pattern 7: Delete

```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);

if (error) {
  logger.error('Failed to delete project', { projectId, error });
  throw new Error('Failed to delete project');
}

// Successful deletion
logger.info('Project deleted', { projectId });
```

### Pattern 8: Upsert

```typescript
const { data, error } = await supabase
  .from('deliverables')
  .upsert({
    id: deliverableId, // If exists, update; else insert
    project_id: projectId,
    title: 'Logo Design',
    status: 'pending',
  })
  .select()
  .single();

if (error) {
  logger.error('Failed to upsert deliverable', { error });
  return null;
}

return data;
```

---

## Edge Functions

### Location

`supabase/functions/`

### Critical Edge Functions

1. **miro-oauth-start**
   - Initiates Miro OAuth flow
   - Generates state token
   - Redirects to Miro authorization

2. **miro-oauth-callback**
   - Handles OAuth callback
   - Exchanges code for access token
   - Stores token in user metadata

3. **miro-webhook**
   - Processes Miro webhook events
   - Validates webhook signature
   - Syncs board changes to database

4. **projects-create**
   - Server-side project creation logic
   - Validation and business rules
   - Audit logging

5. **projects-update**
   - Server-side project update logic
   - Status change notifications
   - Audit logging

6. **sync-worker**
   - Background synchronization worker
   - Periodic sync between database and Miro
   - Handles batch operations

### Edge Function Structure

```typescript
// supabase/functions/example/index.ts
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context (RLS enforced)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Parse request body
    const body = await req.json();

    // Business logic here
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', body.projectId)
      .single();

    if (error) {
      throw error;
    }

    // Return response
    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Invoking Edge Functions from Client

```typescript
// Client-side invocation
const { data, error } = await supabase.functions.invoke('projects-create', {
  body: {
    title: 'New Project',
    clientId: 'client-uuid',
  },
});

if (error) {
  logger.error('Function invocation failed', { error });
  throw new Error(error.message);
}

return data;
```

### Testing Edge Functions Locally

```bash
# Start Supabase local development
supabase start

# Serve specific function
supabase functions serve projects-create --no-verify-jwt

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/projects-create' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"title":"Test Project"}'
```

---

## Real-time Subscriptions

### Pattern 1: Subscribe to Table Changes

**Location**: `src/shared/hooks/useRealtimeSubscription.ts`

```typescript
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';

function ProjectList() {
  const { data, loading, error } = useRealtimeSubscription('projects', {
    event: '*', // INSERT, UPDATE, DELETE
    filter: `status=eq.in_progress`,
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {data.map(project => (
        <li key={project.id}>{project.title}</li>
      ))}
    </ul>
  );
}
```

### Pattern 2: Manual Subscription

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@shared/lib/supabase';
import type { Project } from '@features/projects/domain/types';

function useProjectUpdates(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      setProject(data);
    };

    fetchProject();

    // Subscribe to changes
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          setProject(payload.new as Project);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return project;
}
```

### Pattern 3: Broadcast Channel (Custom Events)

```typescript
// Sender
const channel = supabase.channel('project-updates');

channel.send({
  type: 'broadcast',
  event: 'project-status-changed',
  payload: { projectId, status: 'in_progress' },
});

// Receiver
const channel = supabase.channel('project-updates');

channel.on('broadcast', { event: 'project-status-changed' }, (payload) => {
  console.log('Project status changed:', payload);
  // Update UI
});

channel.subscribe();
```

---

## Storage

### Bucket Structure

- `project-files` - Project attachments (RLS enforced)
- `deliverable-files` - Deliverable files (RLS enforced)
- `avatars` - User profile pictures (public)

### Upload Pattern

```typescript
const uploadFile = async (file: File, projectId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${projectId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    logger.error('File upload failed', { uploadError });
    throw new Error('Failed to upload file');
  }

  // Save metadata to database
  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup uploaded file if DB insert fails
    await supabase.storage.from('project-files').remove([filePath]);
    throw new Error('Failed to save file metadata');
  }

  return fileRecord;
};
```

### Download Pattern

```typescript
const getPublicUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Or download directly
const downloadFile = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('project-files')
    .download(filePath);

  if (error) {
    logger.error('File download failed', { error });
    throw new Error('Failed to download file');
  }

  // Create blob URL
  const url = URL.createObjectURL(data);
  return url;
};
```

### Delete Pattern

```typescript
const deleteFile = async (fileId: string) => {
  // Get file path from database
  const { data: fileRecord, error: fetchError } = await supabase
    .from('files')
    .select('file_path')
    .eq('id', fileId)
    .single();

  if (fetchError || !fileRecord) {
    throw new Error('File not found');
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .remove([fileRecord.file_path]);

  if (storageError) {
    logger.error('Storage deletion failed', { storageError });
    throw new Error('Failed to delete file from storage');
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    logger.error('DB deletion failed', { dbError });
    throw new Error('Failed to delete file record');
  }

  logger.info('File deleted successfully', { fileId });
};
```

---

## Migrations

### Location

`supabase/migrations/`

### Creating a New Migration

```bash
# Create new migration file
supabase migration new add_column_to_projects

# File created: supabase/migrations/YYYYMMDDHHMMSS_add_column_to_projects.sql
```

### Migration Template

```sql
-- Migration: Add google_drive_url to projects
-- Created: 2024-01-15

-- Add column
ALTER TABLE projects
ADD COLUMN google_drive_url TEXT;

-- Create index if needed
CREATE INDEX idx_projects_google_drive_url
ON projects(google_drive_url)
WHERE google_drive_url IS NOT NULL;

-- Update RLS policies if needed
-- (Existing policies apply to new column automatically)

-- Rollback (optional, for documentation)
-- ALTER TABLE projects DROP COLUMN google_drive_url;
```

### Apply Migrations

```bash
# Apply locally
supabase migration up

# Reset and reapply all
supabase db reset

# Push to remote
supabase db push
```

### TypeScript Type Generation After Migration

```bash
# Generate TypeScript types from database schema
supabase gen types typescript --local > src/shared/types/database.types.ts
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
// ✅ CORRECT
const { data, error } = await supabase.from('projects').select('*');
if (error) {
  logger.error('Query failed', { error });
  return [];
}
return data ?? [];

// ❌ WRONG
const { data } = await supabase.from('projects').select('*');
return data; // Could be null!
```

### 2. Use .single() for Single Records

```typescript
// ✅ CORRECT
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', id)
  .single();

// ❌ WRONG
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', id);
const project = data[0]; // noUncheckedIndexedAccess error!
```

### 3. Trust RLS, Don't Duplicate Filters

```typescript
// ✅ CORRECT - RLS handles role filtering
const { data } = await supabase.from('projects').select('*');

// ❌ WRONG - Redundant filter
const user = await supabase.auth.getUser();
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('client_id', user.id); // RLS already does this!
```

### 4. Use Transactions for Related Operations

```typescript
// ✅ CORRECT - Atomic operation
const { data: project, error } = await supabase.rpc('create_project_with_deliverables', {
  p_title: 'Project',
  p_deliverables: ['Logo', 'Brand Guide'],
});

// ❌ WRONG - Separate operations can fail partially
const { data: project } = await supabase.from('projects').insert({ title: 'Project' });
await supabase.from('deliverables').insert({ project_id: project.id, title: 'Logo' });
await supabase.from('deliverables').insert({ project_id: project.id, title: 'Brand Guide' });
```

### 5. Log Audit Trail for Critical Actions

```typescript
// After project update
await supabase.from('audit_logs').insert({
  user_id: userId,
  action: 'project_updated',
  entity_type: 'project',
  entity_id: projectId,
  metadata: { old_status: oldStatus, new_status: newStatus },
});
```

---

## Useful Context7 Queries

When working with Supabase:

```
"Supabase RLS policies for multi-tenant application"
"Supabase Edge Functions with Deno best practices"
"Supabase real-time subscriptions with React"
"Supabase storage upload with progress tracking"
"Supabase database transactions and error handling"
```

---

## Quick Reference

```typescript
// Import client
import { supabase } from '@shared/lib/supabase';

// Select
const { data, error } = await supabase.from('projects').select('*');

// Select single
const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();

// Insert
const { data, error } = await supabase.from('projects').insert({ title: 'New' }).select().single();

// Update
const { data, error } = await supabase.from('projects').update({ status: 'done' }).eq('id', id).select().single();

// Delete
const { error } = await supabase.from('projects').delete().eq('id', id);

// Storage upload
const { data, error } = await supabase.storage.from('bucket').upload(path, file);

// Storage download
const { data, error } = await supabase.storage.from('bucket').download(path);

// Edge Function
const { data, error } = await supabase.functions.invoke('function-name', { body: {} });

// Realtime
const channel = supabase.channel('channel-name').on('postgres_changes', { ... }, callback).subscribe();
```

---

**Remember**: RLS is your friend. Trust it, test it, and don't duplicate its logic in application code.
