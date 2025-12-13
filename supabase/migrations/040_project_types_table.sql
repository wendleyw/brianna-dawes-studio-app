-- ============================================================================
-- MIGRATION 040: PROJECT TYPES TABLE
-- ============================================================================
-- Purpose: Store project types dynamically so admins can manage them
-- Benefits:
--   - Admins can add/edit/delete project types without code changes
--   - Each type has a name, label, days for due date calculation, color, and icon
--   - Sort order for display consistency
-- ============================================================================

-- 1. Create the project_types table
CREATE TABLE IF NOT EXISTS public.project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,                    -- e.g., 'social-post-design'
  label TEXT NOT NULL,                           -- e.g., 'Social Post Design (Carousel / Static)'
  short_label TEXT NOT NULL,                     -- e.g., 'Social Post' (for badges)
  days INTEGER NOT NULL DEFAULT 5,               -- Default due date calculation
  color TEXT NOT NULL DEFAULT '#607D8B',         -- Hex color for badges
  icon TEXT DEFAULT NULL,                        -- Emoji icon (optional)
  sort_order INTEGER NOT NULL DEFAULT 0,         -- Display order
  is_active BOOLEAN NOT NULL DEFAULT true,       -- Soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can read project types (needed for project creation forms)
CREATE POLICY "Anyone can read project_types"
  ON public.project_types
  FOR SELECT
  USING (true);

-- Only admins can manage project types
CREATE POLICY "Admins can manage project_types"
  ON public.project_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text::uuid
      AND users.role = 'admin'
    )
  );

-- 4. Insert default project types (matching current hardcoded values)
INSERT INTO public.project_types (value, label, short_label, days, color, icon, sort_order) VALUES
  ('social-post-design', 'Social Post Design (Carousel / Static)', 'Social Post', 5, '#E91E63', NULL, 1),
  ('hero-section', 'Hero Section or Image Set', 'Hero Section', 5, '#673AB7', NULL, 2),
  ('ad-design', 'Ad Design (Static or GIF)', 'Ad Design', 5, '#3F51B5', NULL, 3),
  ('gif-design', 'GIF Design (Standalone)', 'GIF', 5, '#009688', NULL, 4),
  ('website-assets', 'Website Assets (Individual Sections)', 'Web Assets', 5, '#4CAF50', NULL, 5),
  ('email-design', 'Email Design (Full In-Depth)', 'Email', 7, '#9C27B0', NULL, 6),
  ('video-production', 'Video Production / Reels', 'Video', 7, '#00BCD4', NULL, 7),
  ('website-ui-design', 'Website UI Design (Full Page)', 'Website UI', 11, '#FF9800', NULL, 8),
  ('marketing-campaign', 'Marketing Campaign (Multi-Channel)', 'Marketing', 14, '#2196F3', NULL, 9),
  ('other', 'Other', 'Other', 15, '#607D8B', NULL, 100)
ON CONFLICT (value) DO UPDATE SET
  label = EXCLUDED.label,
  short_label = EXCLUDED.short_label,
  days = EXCLUDED.days,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_project_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_types_updated_at ON public.project_types;
CREATE TRIGGER trigger_update_project_types_updated_at
  BEFORE UPDATE ON public.project_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_types_updated_at();

-- 6. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_types_value ON public.project_types(value);
CREATE INDEX IF NOT EXISTS idx_project_types_active_sort ON public.project_types(is_active, sort_order);

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
Table: project_types
Columns:
  - id: UUID primary key
  - value: Unique identifier string (e.g., 'social-post-design')
  - label: Full display label with details
  - short_label: Short label for badges
  - days: Default days for due date calculation
  - color: Hex color code
  - icon: Optional emoji
  - sort_order: Display order (lower = first)
  - is_active: Soft delete flag
  - created_at, updated_at: Timestamps

RLS:
  - Anyone can read (for forms)
  - Only admins can insert/update/delete
*/
