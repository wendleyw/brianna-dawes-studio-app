-- =====================================================
-- SEED TEST DATA FOR REPORT TESTING
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, let's get the client ID for Sabre Red (or create one)
DO $$
DECLARE
  v_client_id UUID;
  v_designer_id UUID;
  v_project_id UUID;
  v_project_type TEXT;
  v_project_name TEXT;
  v_project_status TEXT;
  v_due_date DATE;
  v_month_offset INT;
  v_deliverable_count INT;
  v_bonus_count INT;
BEGIN
  -- Get the Sabre Red client (assuming it exists)
  SELECT id INTO v_client_id FROM users WHERE role = 'client' LIMIT 1;

  -- Get a designer
  SELECT id INTO v_designer_id FROM users WHERE role = 'designer' LIMIT 1;

  -- If no client found, raise error
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'No client found. Please create a client user first.';
  END IF;

  RAISE NOTICE 'Using client ID: %', v_client_id;
  RAISE NOTICE 'Using designer ID: %', v_designer_id;

  -- Delete existing test projects for this client (clean slate)
  DELETE FROM projects WHERE client_id = v_client_id;

  -- =====================================================
  -- CREATE 15 PROJECTS WITH VARIOUS TYPES AND STATUSES
  -- =====================================================

  -- Project 1: Website Assets - DONE (January)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Homepage Redesign', v_client_id, 'done', 'medium', '2025-01-15', true,
    '{"projectType": "website-assets", "goals": "Redesign homepage for better conversion"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Deliverables for Project 1 (January)
  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Hero Banner v1.0', 'design', 'delivered', 5, 2, '2025-01-10'),
    (v_project_id, 'Feature Icons Set', 'design', 'delivered', 12, 3, '2025-01-12'),
    (v_project_id, 'Footer Design', 'design', 'delivered', 3, 0, '2025-01-15');

  -- Project 2: Social Post Design - DONE (January/February)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Q1 Social Campaign', v_client_id, 'done', 'high', '2025-02-01', true,
    '{"projectType": "social-post-design", "goals": "Launch Q1 social media campaign"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Instagram Posts Batch 1', 'design', 'delivered', 10, 5, '2025-01-20'),
    (v_project_id, 'Facebook Covers', 'design', 'delivered', 4, 1, '2025-01-25'),
    (v_project_id, 'Story Templates', 'design', 'delivered', 8, 2, '2025-02-01');

  -- Project 3: Email Design - IN PROGRESS (February/March)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Newsletter Templates', v_client_id, 'in_progress', 'medium', '2025-03-15', true,
    '{"projectType": "email-design", "goals": "Create reusable newsletter templates"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Welcome Email Template', 'design', 'approved', 3, 1, '2025-02-10'),
    (v_project_id, 'Promo Email Template', 'design', 'in_review', 4, 2, '2025-02-28'),
    (v_project_id, 'Weekly Digest Template', 'design', 'in_progress', 2, 0, '2025-03-15');

  -- Project 4: Marketing Campaign - REVIEW (March)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Spring Sale Campaign', v_client_id, 'review', 'high', '2025-03-20', true,
    '{"projectType": "marketing-campaign", "goals": "Drive spring sale conversions"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Campaign Banners', 'design', 'in_review', 8, 4, '2025-03-10'),
    (v_project_id, 'Landing Page Graphics', 'design', 'in_review', 6, 2, '2025-03-15'),
    (v_project_id, 'Email Graphics', 'design', 'in_review', 5, 1, '2025-03-18');

  -- Project 5: Video Production - IN PROGRESS (March/April)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Product Demo Videos', v_client_id, 'in_progress', 'medium', '2025-04-30', true,
    '{"projectType": "video-production", "goals": "Create product demo video series"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Intro Video', 'video', 'approved', 1, 0, '2025-03-25'),
    (v_project_id, 'Product Feature Videos', 'video', 'in_progress', 4, 1, '2025-04-15'),
    (v_project_id, 'Tutorial Videos', 'video', 'draft', 3, 0, '2025-04-30');

  -- Project 6: GIF Design - DONE (April)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Animated Stickers Pack', v_client_id, 'done', 'low', '2025-04-15', true,
    '{"projectType": "gif-design", "goals": "Create branded animated stickers"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Emoji Stickers', 'design', 'delivered', 15, 5, '2025-04-05'),
    (v_project_id, 'Reaction GIFs', 'design', 'delivered', 10, 3, '2025-04-10'),
    (v_project_id, 'Logo Animations', 'design', 'delivered', 3, 1, '2025-04-15');

  -- Project 7: Ad Design - URGENT (May)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Summer Ads Campaign', v_client_id, 'urgent', 'critical', '2025-05-20', true,
    '{"projectType": "ad-design", "goals": "Launch summer advertising campaign"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Google Display Ads', 'design', 'in_progress', 12, 4, '2025-05-10'),
    (v_project_id, 'Facebook/Meta Ads', 'design', 'draft', 8, 3, '2025-05-15'),
    (v_project_id, 'LinkedIn Ads', 'design', 'draft', 6, 2, '2025-05-20');

  -- Project 8: Hero Section - IN PROGRESS (May/June)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Product Page Heroes', v_client_id, 'in_progress', 'medium', '2025-06-15', true,
    '{"projectType": "hero-section", "goals": "Design hero sections for product pages"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Main Product Hero', 'design', 'approved', 3, 1, '2025-05-25'),
    (v_project_id, 'Category Heroes', 'design', 'in_progress', 5, 2, '2025-06-05'),
    (v_project_id, 'Promo Heroes', 'design', 'draft', 4, 1, '2025-06-15');

  -- Project 9: Website UI Design - REVIEW (June/July)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Mobile App UI', v_client_id, 'review', 'high', '2025-07-10', true,
    '{"projectType": "website-ui-design", "goals": "Design mobile app user interface"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Login/Signup Screens', 'design', 'in_review', 4, 1, '2025-06-15'),
    (v_project_id, 'Dashboard Screens', 'design', 'in_review', 6, 2, '2025-06-25'),
    (v_project_id, 'Settings Screens', 'design', 'in_review', 5, 1, '2025-07-05');

  -- Project 10: Social Post Design - IN PROGRESS (July/August)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Summer Social Content', v_client_id, 'in_progress', 'medium', '2025-08-15', true,
    '{"projectType": "social-post-design", "goals": "Create summer themed social content"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'July Posts', 'design', 'approved', 15, 5, '2025-07-15'),
    (v_project_id, 'August Posts', 'design', 'in_progress', 12, 4, '2025-08-01'),
    (v_project_id, 'Reels Templates', 'design', 'draft', 6, 2, '2025-08-15');

  -- Project 11: Marketing Campaign - DONE (August/September)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Back to School Campaign', v_client_id, 'done', 'high', '2025-09-01', true,
    '{"projectType": "marketing-campaign", "goals": "Back to school promotional campaign"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Campaign Key Visual', 'design', 'delivered', 3, 1, '2025-08-15'),
    (v_project_id, 'Promotional Banners', 'design', 'delivered', 10, 3, '2025-08-25'),
    (v_project_id, 'Social Media Kit', 'design', 'delivered', 20, 8, '2025-09-01');

  -- Project 12: Email Design - IN PROGRESS (September/October)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Fall Newsletter Series', v_client_id, 'in_progress', 'medium', '2025-10-15', true,
    '{"projectType": "email-design", "goals": "Create fall themed newsletter series"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'September Newsletter', 'design', 'delivered', 4, 1, '2025-09-10'),
    (v_project_id, 'October Newsletter', 'design', 'in_progress', 4, 2, '2025-10-05'),
    (v_project_id, 'Special Edition Template', 'design', 'draft', 2, 0, '2025-10-15');

  -- Project 13: Video Production - OVERDUE (October/November)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Brand Story Video', v_client_id, 'overdue', 'critical', '2025-11-01', true,
    '{"projectType": "video-production", "goals": "Create compelling brand story video"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Storyboard', 'document', 'approved', 1, 0, '2025-10-10'),
    (v_project_id, 'Draft Video', 'video', 'in_review', 1, 0, '2025-10-25'),
    (v_project_id, 'Final Video', 'video', 'in_progress', 1, 1, '2025-11-01');

  -- Project 14: Ad Design - REVIEW (November/December)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Holiday Ads 2025', v_client_id, 'review', 'high', '2025-12-01', true,
    '{"projectType": "ad-design", "goals": "Create holiday season advertising"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'Black Friday Ads', 'design', 'in_review', 15, 5, '2025-11-15'),
    (v_project_id, 'Cyber Monday Ads', 'design', 'in_review', 10, 3, '2025-11-20'),
    (v_project_id, 'Christmas Ads', 'design', 'in_review', 12, 4, '2025-12-01');

  -- Project 15: Website Assets - IN PROGRESS (December)
  INSERT INTO projects (name, client_id, status, priority, due_date, due_date_approved, briefing)
  VALUES ('Year End Website Refresh', v_client_id, 'in_progress', 'medium', '2025-12-20', true,
    '{"projectType": "website-assets", "goals": "Refresh website for new year"}'::jsonb)
  RETURNING id INTO v_project_id;

  IF v_designer_id IS NOT NULL THEN
    INSERT INTO project_designers (project_id, user_id) VALUES (v_project_id, v_designer_id) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO deliverables (project_id, name, type, status, count, bonus_count, due_date)
  VALUES
    (v_project_id, 'New Year Banner', 'design', 'in_progress', 3, 1, '2025-12-10'),
    (v_project_id, 'Updated Icons', 'design', 'draft', 20, 5, '2025-12-15'),
    (v_project_id, 'Holiday Theme Assets', 'design', 'draft', 8, 2, '2025-12-20');

  RAISE NOTICE 'Successfully created 15 projects with deliverables spread across all months of 2025!';

END $$;

-- =====================================================
-- SUMMARY QUERY - Run this to verify the data
-- =====================================================
SELECT
  'Projects' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'done') as done,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'review') as review,
  COUNT(*) FILTER (WHERE status = 'urgent') as urgent,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue
FROM projects
WHERE archived_at IS NULL;

SELECT
  'Deliverables' as type,
  COUNT(*) as total,
  SUM(count) as total_assets,
  SUM(bonus_count) as total_bonus
FROM deliverables;

-- Deliverables by month
SELECT
  TO_CHAR(due_date, 'YYYY-MM') as month,
  COUNT(*) as deliverables,
  SUM(count) as assets,
  SUM(bonus_count) as bonus
FROM deliverables
WHERE due_date IS NOT NULL
GROUP BY TO_CHAR(due_date, 'YYYY-MM')
ORDER BY month;

-- By project type
SELECT
  p.briefing->>'projectType' as project_type,
  COUNT(DISTINCT p.id) as projects,
  COUNT(d.id) as deliverables,
  COALESCE(SUM(d.count), 0) as assets,
  COALESCE(SUM(d.bonus_count), 0) as bonus
FROM projects p
LEFT JOIN deliverables d ON d.project_id = p.id
WHERE p.archived_at IS NULL
GROUP BY p.briefing->>'projectType'
ORDER BY assets DESC;
