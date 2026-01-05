-- Migration: Add composite performance indexes
--
-- PROBLEM:
-- Common query patterns filter by multiple columns but only have single-column indexes.
-- For example: "Get all in_progress projects for client X" uses both client_id and status.
-- Single-column indexes are less efficient for these multi-column WHERE clauses.
--
-- SOLUTION:
-- Add composite indexes on frequently combined filter columns:
-- 1. projects(client_id, status) - for client-specific project lists filtered by status
-- 2. deliverables(project_id, status) - for project-specific deliverable lists filtered by status
--
-- NOTE: sync_jobs(status, run_at) already exists as idx_sync_jobs_status_run_at
--
-- ============================================================================
-- STEP 1: Add composite index on projects(client_id, status)
-- ============================================================================

-- Common query pattern: "Get all active/in_progress/done projects for this client"
-- Frontend: ProjectsList filtered by client and status
-- This supports queries like:
--   SELECT * FROM projects WHERE client_id = ? AND status = ?
--   SELECT * FROM projects WHERE client_id = ? AND status IN (?, ?)
CREATE INDEX IF NOT EXISTS idx_projects_client_id_status
  ON public.projects(client_id, status);

COMMENT ON INDEX idx_projects_client_id_status IS
  'Composite index for filtering projects by client and status.
   Optimizes common query pattern: get projects for specific client filtered by status.
   Used in: Client dashboard, project lists, analytics queries.';

-- ============================================================================
-- STEP 2: Add composite index on deliverables(project_id, status)
-- ============================================================================

-- Common query pattern: "Get all pending/approved deliverables for this project"
-- Frontend: DeliverablesList filtered by project and status
-- This supports queries like:
--   SELECT * FROM deliverables WHERE project_id = ? AND status = ?
--   SELECT * FROM deliverables WHERE project_id = ? AND status IN (?, ?)
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id_status
  ON public.deliverables(project_id, status);

COMMENT ON INDEX idx_deliverables_project_id_status IS
  'Composite index for filtering deliverables by project and status.
   Optimizes common query pattern: get deliverables for specific project filtered by status.
   Used in: Project details page, deliverable lists, progress tracking.';

-- ============================================================================
-- STEP 3: Verify index creation and estimate usage
-- ============================================================================

DO $$
DECLARE
  projects_idx_exists boolean;
  deliverables_idx_exists boolean;
  projects_count int;
  deliverables_count int;
BEGIN
  -- Check if indexes were created
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_projects_client_id_status'
  ) INTO projects_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_deliverables_project_id_status'
  ) INTO deliverables_idx_exists;

  -- Get table counts
  SELECT COUNT(*) INTO projects_count FROM public.projects;
  SELECT COUNT(*) INTO deliverables_count FROM public.deliverables;

  -- Log results
  IF projects_idx_exists THEN
    RAISE NOTICE 'Created idx_projects_client_id_status - will optimize queries on % projects', projects_count;
  ELSE
    RAISE WARNING 'Failed to create idx_projects_client_id_status';
  END IF;

  IF deliverables_idx_exists THEN
    RAISE NOTICE 'Created idx_deliverables_project_id_status - will optimize queries on % deliverables', deliverables_count;
  ELSE
    RAISE WARNING 'Failed to create idx_deliverables_project_id_status';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

-- PERFORMANCE IMPACT:
--
-- Composite indexes are more efficient than single-column indexes when:
-- 1. Filtering by multiple columns in WHERE clause
-- 2. First column has high cardinality (many unique values)
-- 3. Second column is used for additional filtering
--
-- QUERY EXAMPLES THAT BENEFIT:
--
-- projects(client_id, status):
--   - SELECT * FROM projects WHERE client_id = 'uuid' AND status = 'in_progress'
--   - SELECT * FROM projects WHERE client_id = 'uuid' AND status IN ('in_progress', 'review')
--   - SELECT COUNT(*) FROM projects WHERE client_id = 'uuid' AND status = 'done'
--
-- deliverables(project_id, status):
--   - SELECT * FROM deliverables WHERE project_id = 'uuid' AND status = 'in_review'
--   - SELECT * FROM deliverables WHERE project_id = 'uuid' AND status IN ('approved', 'delivered')
--   - SELECT COUNT(*) FROM deliverables WHERE project_id = 'uuid' AND status = 'draft'
--
-- INDEX SIZE CONSIDERATIONS:
--
-- Composite indexes are slightly larger than single-column indexes but provide
-- significant query performance improvements. PostgreSQL can also use composite
-- indexes for queries filtering only by the first column (client_id or project_id).
--
-- MAINTENANCE:
--
-- These indexes are automatically maintained by PostgreSQL during INSERT, UPDATE, DELETE.
-- No manual maintenance required. If tables grow very large (>1M rows), consider
-- periodic VACUUM ANALYZE to update statistics for optimal query planning.

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check all indexes on projects table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'projects' ORDER BY indexname;

-- Check all indexes on deliverables table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'deliverables' ORDER BY indexname;

-- Explain plan for composite index query (should use idx_projects_client_id_status):
-- EXPLAIN ANALYZE SELECT * FROM projects WHERE client_id = 'some-uuid' AND status = 'in_progress';

-- Explain plan for composite index query (should use idx_deliverables_project_id_status):
-- EXPLAIN ANALYZE SELECT * FROM deliverables WHERE project_id = 'some-uuid' AND status = 'in_review';

-- Check index sizes:
-- SELECT
--   indexname,
--   pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
-- FROM pg_indexes
-- WHERE tablename IN ('projects', 'deliverables')
-- ORDER BY pg_relation_size(indexname::regclass) DESC;
