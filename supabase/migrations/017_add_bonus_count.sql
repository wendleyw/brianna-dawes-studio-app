-- Add bonus_count column to deliverables table
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS bonus_count INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN deliverables.bonus_count IS 'Number of bonus assets included with this deliverable';
