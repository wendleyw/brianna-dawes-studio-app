-- 018_allow_clients_create_projects.sql
-- This migration file previously contained non-SQL runtime output, which made the database unreproducible.
-- The intent (historically) was to adjust RLS/policies so "client" users could create projects.
--
-- Current security/policy logic is handled in later migrations (see: 031_fix_all_rls_policies.sql, 032_add_transactional_project_functions.sql, 036_remove_permissive_anon_policies.sql).
-- Keeping this migration as a no-op preserves migration ordering without mutating production behavior.

begin;
-- no-op
commit;
