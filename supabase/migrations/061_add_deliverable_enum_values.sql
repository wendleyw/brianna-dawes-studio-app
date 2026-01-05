-- Migration: Add missing deliverable enum values to migrations
--
-- PROBLEM:
-- The deliverable_type and deliverable_status enums in the current database
-- have more values than what's defined in the original migration 003.
-- The values 'concept', 'design', 'revision', 'final' for deliverable_type
-- and 'in_progress' for deliverable_status were added manually but not tracked.
--
-- This causes problems when:
-- 1. Setting up new environments from migrations
-- 2. Resetting databases
-- 3. Team members creating local development databases
--
-- SOLUTION:
-- Add the missing enum values using ALTER TYPE ... ADD VALUE IF NOT EXISTS
-- to ensure migrations match the current production database state.
--
-- ============================================================================
-- STEP 1: Add missing deliverable_type values
-- ============================================================================

-- Add 'concept' type (for conceptual/ideation deliverables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'deliverable_type'::regtype
    AND enumlabel = 'concept'
  ) THEN
    ALTER TYPE deliverable_type ADD VALUE 'concept';
    RAISE NOTICE 'Added deliverable_type value: concept';
  ELSE
    RAISE NOTICE 'deliverable_type value already exists: concept';
  END IF;
END $$;

-- Add 'design' type (for design deliverables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'deliverable_type'::regtype
    AND enumlabel = 'design'
  ) THEN
    ALTER TYPE deliverable_type ADD VALUE 'design';
    RAISE NOTICE 'Added deliverable_type value: design';
  ELSE
    RAISE NOTICE 'deliverable_type value already exists: design';
  END IF;
END $$;

-- Add 'revision' type (for revision deliverables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'deliverable_type'::regtype
    AND enumlabel = 'revision'
  ) THEN
    ALTER TYPE deliverable_type ADD VALUE 'revision';
    RAISE NOTICE 'Added deliverable_type value: revision';
  ELSE
    RAISE NOTICE 'deliverable_type value already exists: revision';
  END IF;
END $$;

-- Add 'final' type (for final deliverables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'deliverable_type'::regtype
    AND enumlabel = 'final'
  ) THEN
    ALTER TYPE deliverable_type ADD VALUE 'final';
    RAISE NOTICE 'Added deliverable_type value: final';
  ELSE
    RAISE NOTICE 'deliverable_type value already exists: final';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add missing deliverable_status value
-- ============================================================================

-- Add 'in_progress' status (between 'draft' and 'in_review')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'deliverable_status'::regtype
    AND enumlabel = 'in_progress'
  ) THEN
    -- Note: We can't specify position with IF NOT EXISTS pattern
    -- The value will be added at the end, but that's acceptable
    -- because PostgreSQL doesn't enforce enum ordering in constraints
    ALTER TYPE deliverable_status ADD VALUE 'in_progress';
    RAISE NOTICE 'Added deliverable_status value: in_progress';
  ELSE
    RAISE NOTICE 'deliverable_status value already exists: in_progress';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify enum values
-- ============================================================================

-- Log current enum values for verification
DO $$
DECLARE
  type_values text[];
  status_values text[];
BEGIN
  -- Get deliverable_type values
  SELECT array_agg(enumlabel ORDER BY enumsortorder)
  INTO type_values
  FROM pg_enum
  WHERE enumtypid = 'deliverable_type'::regtype;

  -- Get deliverable_status values
  SELECT array_agg(enumlabel ORDER BY enumsortorder)
  INTO status_values
  FROM pg_enum
  WHERE enumtypid = 'deliverable_status'::regtype;

  RAISE NOTICE 'Current deliverable_type values: %', type_values;
  RAISE NOTICE 'Current deliverable_status values: %', status_values;

  -- Verify we have all expected values
  IF array_length(type_values, 1) < 9 THEN
    RAISE WARNING 'deliverable_type should have 9 values, but has %', array_length(type_values, 1);
  END IF;

  IF array_length(status_values, 1) < 6 THEN
    RAISE WARNING 'deliverable_status should have 6 values, but has %', array_length(status_values, 1);
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TYPE deliverable_type IS
  'Types of deliverables in the system.
   Values: image, video, document, archive, other, concept, design, revision, final
   Frontend expects all 9 values to be available.';

COMMENT ON TYPE deliverable_status IS
  'Status lifecycle of deliverables.
   Values: draft, in_progress, in_review, approved, rejected, delivered
   Frontend expects all 6 values to be available.';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check all deliverable_type values:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'deliverable_type'::regtype ORDER BY enumsortorder;

-- Check all deliverable_status values:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'deliverable_status'::regtype ORDER BY enumsortorder;

-- Check deliverables using these types:
-- SELECT type, status, COUNT(*) FROM deliverables GROUP BY type, status ORDER BY type, status;
