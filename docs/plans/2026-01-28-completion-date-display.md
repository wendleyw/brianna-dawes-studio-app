# Completion Date Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show planned due date and actual completion date side by side on Done projects, with a green "X days early" badge when completed before the deadline.

**Architecture:** Database trigger auto-sets `completed_at` on status change to `done`. A shared utility function calculates days saved. Miro timeline gets a green text element below Done cards. Web app UI shows both dates in ProjectCard stats area.

**Tech Stack:** PostgreSQL trigger, TypeScript, React, Miro SDK v2, CSS Modules

---

## Task 1: Database trigger to auto-set `completed_at`

**Files:**
- Create: `supabase/migrations/064_auto_set_completed_at.sql`

**Step 1: Write the migration**

```sql
-- Auto-set completed_at when project status changes to 'done'
-- and clear it when status changes away from 'done'
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When status changes TO 'done', set completed_at if not already set
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status <> 'done') THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
  END IF;

  -- When status changes AWAY FROM 'done', clear completed_at
  IF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_completed_at_trigger ON public.projects;
CREATE TRIGGER set_completed_at_trigger
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.set_completed_at();
```

**Step 2: Apply migration via Supabase MCP tool**

Use `mcp__supabase__apply_migration` with name `auto_set_completed_at` and the SQL above.

**Step 3: Verify it works**

Run SQL to test:
```sql
-- Check a done project has completed_at set
SELECT id, name, status, completed_at FROM projects WHERE status = 'done' LIMIT 5;
```

**Step 4: Backfill existing Done projects**

Run SQL:
```sql
-- Backfill: set completed_at = updated_at for existing done projects without completed_at
UPDATE projects
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;
```

**Step 5: Commit**

```bash
git add supabase/migrations/064_auto_set_completed_at.sql
git commit -m "feat(db): auto-set completed_at on project status change to done"
```

---

## Task 2: Add `getDaysEarly` utility to `dateFormat.ts`

**Files:**
- Modify: `src/shared/lib/dateFormat.ts`

**Step 1: Add the utility function**

Add at the end of `src/shared/lib/dateFormat.ts`:

```typescript
/**
 * Calculate days saved (completed early) for Done projects.
 * Returns positive number if completed before due date, null otherwise.
 * Used in: ProjectCard, Miro timeline, detail pages
 */
export function getDaysEarly(
  dueDate: string | Date | null,
  completedAt: string | Date | null
): { days: number; text: string } | null {
  if (!dueDate || !completedAt) return null;

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const completed = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;

  // Compare dates only (ignore time)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const completedDay = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());

  const diffMs = dueDay.getTime() - completedDay.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return null;

  return {
    days,
    text: `${days} day${days === 1 ? '' : 's'} early`,
  };
}
```

**Step 2: Commit**

```bash
git add src/shared/lib/dateFormat.ts
git commit -m "feat(utils): add getDaysEarly utility for completion date comparison"
```

---

## Task 3: Update ProjectCard to show completion dates for Done projects

**Files:**
- Modify: `src/features/projects/components/ProjectCard/ProjectCard.tsx`
- Modify: `src/features/projects/components/ProjectCard/ProjectCard.module.css`

**Step 1: Import getDaysEarly and formatDateShort**

In `ProjectCard.tsx`, add to imports:

```typescript
import { formatDateShort, getDaysEarly } from '@shared/lib/dateFormat';
```

**Step 2: Update the `daysMeta` useMemo for Done state**

Replace the Done case in the `daysMeta` useMemo (around line 213):

Current code:
```typescript
if (project.status === 'done') {
  return { value: '???', label: 'Completed', state: 'done' as const };
}
```

New code:
```typescript
if (project.status === 'done') {
  const early = getDaysEarly(project.dueDate, project.completedAt);
  return {
    value: '???',
    label: 'Completed',
    state: 'done' as const,
    dueDate: project.dueDate,
    completedAt: project.completedAt,
    daysEarly: early,
  };
}
```

Note: The `daysMeta` type needs to be updated to support these optional fields. Change the useMemo return type inline.

**Step 3: Update the stats grid to show dual dates when Done**

In the stats grid (around line 840-882), replace the existing days stat card for Done state. When `daysMeta.state === 'done'`, render the dual date display instead of just the checkmark:

```tsx
<div
  className={`${styles.statCard} ${styles.statDone}`}
>
  {daysMeta.state === 'done' && daysMeta.completedAt ? (
    <div className={styles.completionDates}>
      {daysMeta.dueDate && (
        <div className={styles.datePair}>
          <span className={styles.dateLabel}>Due:</span>
          <span className={styles.dateValue}>{formatDateShort(daysMeta.dueDate)}</span>
        </div>
      )}
      <div className={styles.datePair}>
        <span className={styles.dateLabel}>Completed:</span>
        <span className={styles.dateValue}>{formatDateShort(daysMeta.completedAt)}</span>
      </div>
      {daysMeta.daysEarly && (
        <span className={styles.daysEarlyBadge}>
          {daysMeta.daysEarly.text}
        </span>
      )}
    </div>
  ) : (
    <>
      <span className={styles.statValue}>{daysMeta.value}</span>
      <span className={styles.statLabel}>{daysMeta.label}</span>
    </>
  )}
</div>
```

**Step 4: Add CSS styles**

Add to `ProjectCard.module.css`:

```css
/* Completion date display for Done projects */
.completionDates {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.datePair {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1.2;
}

.dateLabel {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.dateValue {
  color: var(--color-text-primary);
  font-weight: 600;
}

.daysEarlyBadge {
  display: inline-block;
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background-color: var(--color-success);
  color: var(--color-text-inverse);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
```

**Step 5: Commit**

```bash
git add src/features/projects/components/ProjectCard/ProjectCard.tsx src/features/projects/components/ProjectCard/ProjectCard.module.css
git commit -m "feat(ui): show dual dates and days-early badge on Done projects in ProjectCard"
```

---

## Task 4: Update Miro timeline cards with completion text element

**Files:**
- Modify: `src/features/boards/services/miroSdkService.ts`

This is the most involved task. We need to create a green text element below Done cards on the Miro timeline.

**Step 1: Import getDaysEarly**

At the top of `miroSdkService.ts`, add:

```typescript
import { getDaysEarly, formatDateShort } from '@shared/lib/dateFormat';
```

**Step 2: Add completion text element after card sync**

In the `syncProjectToTimeline` method (the function that creates/updates timeline cards), after the card is created or updated and after `handleDoneOverlay` is called, add logic to create/update a completion text element below the card.

Find where the card is synced (around line 1180 for update, line 1289 for create). After the card sync, add:

```typescript
// After card sync - add/remove completion date text below Done cards
await this.handleCompletionDateText(project, status, cardX, cardY);
```

**Step 3: Add the `handleCompletionDateText` method**

Add a new private method to the `MiroSdkService` class:

```typescript
/**
 * Create/update/remove a green completion date text element below Done cards
 * Format: "Due: Dec 6 | Done: Dec 3\n3 days early"
 */
private async handleCompletionDateText(
  project: Project,
  status: ProjectStatus,
  cardX: number,
  cardY: number
): Promise<void> {
  const miro = getMiroSDK();
  const isDone = status === 'done';
  const textTag = `completion_text:${project.id}`;

  // Find existing completion text element
  const allTexts = await miro.board.get({ type: 'text' }) as Array<{
    id: string;
    content: string;
    x: number;
    y: number;
    width: number;
  }>;
  const existingText = allTexts.find(t => t.content?.includes(textTag));

  if (!isDone) {
    // Remove completion text if project is no longer done
    if (existingText) {
      try {
        await safeRemove(existingText.id);
      } catch {
        // Ignore removal errors
      }
    }
    return;
  }

  // Build completion text content
  const completedDate = project.completedAt
    ? formatDateShort(project.completedAt)
    : formatDateShort(new Date().toISOString());
  const dueDate = project.dueDate ? formatDateShort(project.dueDate) : null;
  const early = getDaysEarly(project.dueDate, project.completedAt);

  let textContent = '';
  if (dueDate) {
    textContent = `Due: ${dueDate} | Done: ${completedDate}`;
  } else {
    textContent = `Done: ${completedDate}`;
  }
  if (early) {
    textContent += `\n${early.text}`;
  }

  // Hidden tag for identification (zero-width space trick or HTML comment won't work,
  // so we use a tiny font invisible tag in the content)
  const fullContent = `<p style="color: #10B981; font-size: 9px;"><b>${textContent}</b></p><!-- ${textTag} -->`;

  // Position: below the card
  const textY = cardY + TIMELINE.CARD_HEIGHT / 2 + 12;

  if (existingText) {
    // Update existing text
    try {
      const item = await miro.board.getById(existingText.id);
      if (item && 'content' in item) {
        (item as { content: string; x: number; y: number }).content = fullContent;
        (item as { x: number }).x = cardX;
        (item as { y: number }).y = textY;
        await miro.board.sync(item);
      }
    } catch {
      // If update fails, remove and recreate
      try { await safeRemove(existingText.id); } catch { /* ignore */ }
    }
  }

  if (!existingText) {
    // Create new text element
    await miro.board.createText({
      content: fullContent,
      x: cardX,
      y: textY,
      width: TIMELINE.CARD_WIDTH + 20,
      style: {
        fontSize: 9,
        textAlign: 'center',
        color: '#10B981', // Green
      },
    });
  }
}
```

**Important Notes:**
- The `<!-- ${textTag} -->` comment is used to identify the text element for future updates/removal. Miro text content supports HTML.
- The text is positioned at `cardY + CARD_HEIGHT/2 + 12` (just below the card).
- Uses green color `#10B981` (same as the Done/Success color from the design system).
- Width matches card width + small padding.

**Step 4: Commit**

```bash
git add src/features/boards/services/miroSdkService.ts
git commit -m "feat(miro): add green completion date text below Done cards on timeline"
```

---

## Task 5: Update briefing frame date display

**Files:**
- Modify: `src/features/boards/services/miroSdkService.ts`

**Step 1: Update the briefing frame header date text**

In the `createBriefingContent` method (around line 1975), the due date is displayed in the briefing frame header. Update it to show both dates when Done:

Find the `dueDateText` construction (line 1975-1977):

```typescript
const dueDateText = project.dueDate
  ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : 'No deadline';
```

Replace with:

```typescript
let dueDateText: string;
if (project.status === 'done' && project.completedAt) {
  const dueStr = project.dueDate
    ? formatDateShort(project.dueDate)
    : 'No deadline';
  const completedStr = formatDateShort(project.completedAt);
  const early = getDaysEarly(project.dueDate, project.completedAt);
  dueDateText = `Due: ${dueStr} | Completed: ${completedStr}`;
  if (early) {
    dueDateText += ` (${early.text})`;
  }
} else {
  dueDateText = project.dueDate
    ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No deadline';
}
```

**Step 2: Commit**

```bash
git add src/features/boards/services/miroSdkService.ts
git commit -m "feat(miro): show dual dates in briefing frame header for Done projects"
```

---

## Task 6: Update ProjectCardHeader (new refactored component)

**Files:**
- Modify: `src/features/projects/components/ProjectCard/ProjectCardHeader.tsx`

**Step 1: Add completion date info to the Done banner**

The `ProjectCardHeader.tsx` doesn't currently show a Done banner (that's in `ProjectCard.tsx`). But it shows badges. No changes needed here since the dual date display is handled in the main `ProjectCard.tsx` stats grid (Task 3).

Skip this task -- the `ProjectCardHeader.tsx` is a separate component used in a different context and doesn't need the date display.

---

## Task 7: Verify and test

**Step 1: Type check**

```bash
npm run typecheck
```

Expected: No type errors.

**Step 2: Build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Manual verification**

1. Open the app, find a Done project -- verify dual dates show in the ProjectCard stats area
2. If project was completed early, verify green badge shows "X days early"
3. Open Miro board, sync a Done project -- verify green text appears below the timeline card
4. Verify that projects NOT done don't show any completion text

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: completion date display with days-early badge for Done projects"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/migrations/064_auto_set_completed_at.sql` | DB trigger: auto-set/clear `completed_at` on status change |
| `src/shared/lib/dateFormat.ts` | Add `getDaysEarly()` utility |
| `src/features/projects/components/ProjectCard/ProjectCard.tsx` | Dual date display in stats grid for Done projects |
| `src/features/projects/components/ProjectCard/ProjectCard.module.css` | Styles for completion dates and days-early badge |
| `src/features/boards/services/miroSdkService.ts` | Green text below Done cards + dual dates in briefing header |
