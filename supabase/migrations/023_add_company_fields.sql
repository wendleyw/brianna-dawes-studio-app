-- Migration: Add company fields to users table for personalized client experience
-- This allows clients to have their own company logo and name displayed in their dashboard

-- Add company_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN company_name TEXT;
  END IF;
END $$;

-- Add company_logo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN company_logo_url TEXT;
  END IF;
END $$;

-- Add index for company lookups (useful for searching by company)
CREATE INDEX IF NOT EXISTS idx_users_company_name ON public.users(company_name);

-- Comment explaining the fields
COMMENT ON COLUMN public.users.company_name IS 'Company/brand name of the client for personalized dashboard display';
COMMENT ON COLUMN public.users.company_logo_url IS 'URL to the client company logo for personalized dashboard display';
