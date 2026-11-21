-- Tenant isolation in the database, behind the application's own checks (defence in depth).
-- Every query on records and files runs in a transaction that sets app.org to the organisation it serves;
-- rows of any other organisation are invisible and can't be written. With app.org unset, nothing is visible.
-- FORCE applies the policy to the table owner too; only superusers and BYPASSRLS roles (migrations and
-- platform administration) skip it. The app connects as a separate role without either.
ALTER TABLE "records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "records_tenant_isolation" ON "records"
  USING ("organisation_id" = NULLIF(current_setting('app.org', true), ''))
  WITH CHECK ("organisation_id" = NULLIF(current_setting('app.org', true), ''));--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "files_tenant_isolation" ON "files"
  USING ("organisation_id" = NULLIF(current_setting('app.org', true), ''))
  WITH CHECK ("organisation_id" = NULLIF(current_setting('app.org', true), ''));--> statement-breakpoint
-- A candidate's test link carries only a random token, so the organisation has to be found before any is set.
-- This function answers that one question (which organisation issued this token) and nothing else.
CREATE OR REPLACE FUNCTION "vettly_invitation_org"(token text) RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
    SELECT organisation_id FROM public.records
    WHERE kind = 'invitation' AND data->>'token' = token AND length(token) BETWEEN 16 AND 64
    LIMIT 1
  $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "vettly_invitation_org"(text) FROM PUBLIC;
