# Multi-tenant data isolation in PostgreSQL (emphasis: Row-Level Security with postgres.js + Drizzle)

Scope note: target is PostgreSQL 16, one shared database, a central JSONB table keyed by (organisation_id, kind, id) plus relational tables (users, memberships, sessions, tokens, files). Research done November 2026. Several AWS Prescriptive Guidance pages returned 404 on fetch and the AWS Database Blog body could not be extracted, so AWS findings come from search-result snippets only (flagged below).

## 1. Isolation models: shared tables + tenant_id vs schema-per-tenant vs database-per-tenant

### Takeaway
Vendors broadly agree there is no universal answer, but shared tables with a tenant key ("pool") is the cheapest and simplest to operate. AWS says RLS is *required* for isolation in a pooled PostgreSQL model. Schema-per-tenant and database-per-tenant buy stronger isolation and per-tenant backup, keys or residency, but they cost more and make migrations slow. Table-per-tenant is an explicit antipattern.

### Cited Findings
- AWS Prescriptive Guidance names three PostgreSQL SaaS partitioning models: silo (a separate instance or cluster per tenant), bridge (a hybrid with a shared instance but separate databases or schemas) and pool (shared tables). — [AWS Prescriptive Guidance (search snippet)](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html)
- AWS: "Row-level security (RLS) is required to maintain tenant data isolation in a pool model with PostgreSQL." — [AWS Prescriptive Guidance, pool model (search snippet)](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/pool.html)
- For the bridge model, AWS recommends one database per tenant over one schema per tenant. AWS Solutions guidance instead describes bridge as schema-per-tenant, so the two AWS sources differ. — [AWS Prescriptive Guidance, bridge (search snippet)](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html); [AWS Guidance for Multi-Tenant Architectures](https://docs.aws.amazon.com/solutions/multi-tenant-architectures-on-aws/)
- AWS also notes, in the same guidance, that "by default, the table owner bypasses RLS policies unless the table is altered with FORCE ROW LEVEL SECURITY." — [AWS Prescriptive Guidance RLS recommendations (search snippet; page 404 on fetch)](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html)
- Azure: a shared multitenant database "provides the highest density of tenants to infrastructure, so it tends to come at the lowest financial cost," and it reduces management overhead (one thing to back up and secure). Its drawbacks are scale limits of the single resource, noisy neighbours, hard per-tenant consumption metering, the inability to meet differing per-tenant security, backup or location requirements, and difficult per-tenant schema customisation. — [Azure Architecture Center: Storage and data approaches (updated 2026)](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure: dedicated databases per tenant isolate data and allow some customisation, but cost more. Automated provisioning is essential, "otherwise, the complexity of manually deploying and managing the databases becomes overwhelming." — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure gives three triggers for isolating a tenant or grouping like tenants: the tenant needs its own encryption keys, the tenant has individual backup and restore policies, or the data must be stored in different geographies. — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure on tenant lifecycle: "In a shared database, restoring a single tenant might require you to restore the database to a separate resource and selectively recover that tenant's data." — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure antipatterns for relational stores are table-per-tenant ("use a single set of multitenant tables with a tenant identifier column" instead), per-tenant columns, manual schema changes, and hard dependency on a single schema version. — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure on RLS: it "can provide security isolation for specific tenants' data in a shared multitenant database". However, identity and tenant context must be propagated into every query, which "can be complex to design, implement, test, and maintain. Many multitenant solutions don't use row-level security because of those complexities." — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Azure suggests a hybrid: a multitenant database for most tenants plus single-tenant stamps for tenants who pay more or have unusual requirements. — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- Citus (2016) on schema-per-tenant: schema changes go "from seconds to minutes to hours across thousands of different tenants", and connection pools built around one database need "extra work" across schemas. Citus 12 (2023) later added native schema-based sharding. — [Citus: Lessons learned from Postgres schema sharding](https://www.citusdata.com/blog/2016/12/18/schema-sharding-lessons/); [Citus 12 schema-based sharding](https://www.citusdata.com/blog/2023/07/18/citus-12-schema-based-sharding-for-postgres/)
- Citus schema-based sharding co-locates a schema's tables on one node. Joins and foreign keys should involve only tables in the same schema (or reference tables). — [Citus 12 blog (search snippet)](https://www.citusdata.com/blog/2023/07/18/citus-12-schema-based-sharding-for-postgres/)
- RLS does not isolate CPU, memory, disk or cache per tenant, so noisy-neighbour concerns remain in the pool model. — [Nile: Shipping multi-tenant SaaS using Postgres RLS](https://www.thenile.dev/blog/multi-tenant-rls)

### Inferences
- The current design (one database, a JSONB table keyed by organisation_id, relational tables) is the pool model that AWS, Azure and Crunchy treat as the default for cost-efficient SaaS. The vendor-consensus way to harden it is RLS on every tenant-scoped table, not a move to schemas.
- Keep a silo or stamp escape hatch for enterprise tenants who need CMK, residency or a dedicated backup or restore. Per-tenant restore from a shared database is a known operational pain, so plan for tenant-scoped export or restore tooling.

### Gaps
- The full AWS decision matrix (matrix.html) returned 404, so its cell-by-cell comparison is not captured. The AWS Database Blog post "Multi-tenant data isolation with PostgreSQL Row Level Security" could not be extracted (page body truncated).
- I found no official Citus or PostgreSQL figure for a practical upper limit on schema count. Third-party claims (for example, "a few thousand schemas", "10–50 ms planning at 10k schemas") are unverified.

## 2. RLS mechanics (PostgreSQL 16)

### Takeaway
`ENABLE ROW LEVEL SECURITY` with no policy means default-deny. Superusers and BYPASSRLS roles always bypass RLS, and table owners bypass it unless `FORCE ROW LEVEL SECURITY` is set. USING silently filters existing rows, while WITH CHECK raises an error on bad new rows. Permissive policies are combined with OR, so adding any broad permissive policy widens access. Index the tenant column and keep predicates simple and row-local.

### Cited Findings
- With RLS enabled, "all normal access to the table for selecting rows or modifying rows must be allowed by a row security policy... If no policy exists for the table, a default-deny policy is used." — [PG16 docs: Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- "Superusers and roles with the BYPASSRLS attribute always bypass the row security system." Table owners also normally bypass it, but an owner can be made subject to policies with `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. — [PG16 docs: Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- TRUNCATE and REFERENCES "are not subject to row security". Only the table owner can enable or disable RLS or add policies. — [PG16 docs: Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Disabling RLS does not drop policies. They are simply ignored. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Policies can target ALL, SELECT, INSERT, UPDATE or DELETE, and specific roles. If no role is given, or PUBLIC is used, the policy applies to all users. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- If a policy omits WITH CHECK, it implicitly uses its USING clause as the check. That stops a user from creating rows (via INSERT or UPDATE) belonging to someone else. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Per command: SELECT policies take only USING, INSERT only WITH CHECK, DELETE only USING, and UPDATE both. USING false or null silently hides rows, while WITH CHECK false or null aborts the whole command with an error. — [PG16 docs: CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- An UPDATE or DELETE whose WHERE, RETURNING or SET right-hand side reads target columns also needs a SELECT policy to pass. The row must be visible via SELECT/ALL *and* modifiable via UPDATE/DELETE/ALL. — [PG16 docs: CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- `INSERT ... ON CONFLICT DO UPDATE` checks the proposed row against SELECT policies and errors (it is never silently skipped). The existing row must pass the UPDATE USING clause or an error is thrown. INSERT WITH CHECK runs for every proposed row. — [PG16 docs: CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- Permissive policies (the default) combine with OR, and restrictive policies (`AS RESTRICTIVE`) combine with AND. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html). Adding a broad permissive "admin" policy therefore widens everyone's access, so use RESTRICTIVE or keep a single combined policy. — [Bytebase: RLS footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Policy expressions are evaluated before user query conditions, except LEAKPROOF functions, which the optimizer may apply earlier. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html); [CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- Performance: a non-LEAKPROOF function or operator in a policy or query can prevent index use or pushdown. Index the policy columns (composites for AND conditions, e.g. `(tenant_id, owner_id)`), and move complex subquery logic into STABLE functions. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Supabase: add a btree index on every policy column. Only a column that leads a btree index counts as indexed, so a composite PK `(team_id, user_id)` does not index `user_id`. Wrap row-independent function calls as `(select fn())` so they run once per statement as an initPlan. Specify roles with `TO` so a policy isn't evaluated for other roles. — [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- PG docs: "the simplest and best-performing case" is a policy that considers only the current row's values. Policies with sub-SELECTs on other tables can create race conditions that leak information under READ COMMITTED. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- The `row_security` setting set to off does not bypass RLS. It makes a query error if its results would be filtered, which is useful for making sure backups (pg_dump) are complete. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- RLS failures are silent: a blocked UPDATE affects 0 rows. The Nile team moved error handling into the data layer, for example returning a 404 when `RETURNING` yields nothing. — [Nile](https://www.thenile.dev/blog/multi-tenant-rls); [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)

### Inferences
- For the JSONB table keyed by (organisation_id, kind, id), a PK or index with `organisation_id` leading satisfies the indexing advice. Every secondary index on that table (for example a GIN on the JSONB, or an index on `kind`) should normally lead with or include organisation_id, so RLS-filtered queries stay index-driven.
- A simple equality predicate `organisation_id = <setting>` is row-local and avoids the race-condition and sub-SELECT costs the docs warn about. Membership checks (is this user in this org?) are better done once in the app at request start, rather than as a sub-SELECT inside every policy.

### Gaps
- I found no authoritative benchmark numbers for RLS overhead in this pass. Supabase links a separate performance guide that was not fetched.

## 3. Passing the tenant: set_config / SET LOCAL, pools, failing closed

### Takeaway
Set the tenant with `set_config('app.tenant_id', $1, true)` (equivalent to `SET LOCAL`) as the first statement of every transaction, and read it in policies with `NULLIF(current_setting('app.tenant_id', true), '')::uuid`. Session-level SET leaks across pooled connections. With `missing_ok = true` an unset value gives NULL, so the predicate is NULL and rows are hidden (fail closed). Once the setting has been used on a connection, though, it reads back as `''` rather than NULL, so NULLIF is needed to keep that fail-closed behaviour.

### Cited Findings
- `set_config(name, value, is_local)`: if is_local is true, "the new value will only apply during the current transaction". false applies it for the rest of the session. — [PG16 docs: admin functions](https://www.postgresql.org/docs/16/functions-admin.html)
- `current_setting(name, missing_ok)` throws an error if the setting doesn't exist, unless missing_ok is true, in which case it returns NULL. — [PG16 docs: admin functions](https://www.postgresql.org/docs/16/functions-admin.html)
- Pitfall: after a custom setting has been SET (even SET LOCAL) in a session, it keeps existing after the transaction ends and `current_setting(..., true)` returns an empty string, not NULL. A maintainer explains that SET makes the placeholder GUC "spring into existence" with an empty-string default. The reported workaround is `NULLIF(current_setting(...), '')`. — [pgsql-bugs thread](https://www.postgresql.org/message-id/CA+Q86ij0KDCB0G45G509-8q0DNR611gcKG-sSM83GA1EBL7boA@mail.gmail.com); [pgsql thread "RESET, NULL and empty-string valued settings"](https://postgresql.org/message-id/1095764.1729350466%40sss.pgh.pa.us)
- Crunchy Data's tenant policy uses exactly this defensive form: `USING (org_id = NULLIF(current_setting('rls.org_id', TRUE), '')::uuid)` with `TO application`. Their example sets the variable with plain `SET` in a request hook and does not address pooling. The article also has a naming mismatch (`rls.org_id` vs `app.current_org_id`), so do not copy it verbatim. — [Crunchy Data: RLS for tenants](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- PgBouncer: in transaction pooling, "the server_reset_query is not used", because "clients must not use any session-based features, since each transaction ends up in a different connection". `server_reset_query_always` exists only "for working around broken setups". — [PgBouncer config docs](https://www.pgbouncer.org/config.html)
- postgres.js: "In both transaction modes a session belongs to a client only for the length of a transaction," so `SET`, `LISTEN` or temp tables only work inside `sql.begin`. PgBouncer also rejects unknown startup parameters, so a `connection: { 'app.var': ... }` option needs `ignore_startup_parameters` or a SET inside a transaction. — [postgres.js README](https://github.com/porsager/postgres)
- Community guides agree: transaction-mode pooler plus session-scoped config equals a cross-tenant breach. Treating reset queries as a safety net is fragile, and the same applies to PgCat and managed-service poolers. — [ClickHouse engineering guide](https://clickhouse.com/resources/engineering/multi-tenant-saas-postgres-architecture); [DEV: why tenant context must be scoped per transaction](https://dev.to/m_zinger_2fc60eb3f3897908/why-tenant-context-must-be-scoped-per-transaction-3aop)
- Nile incident (application-side analogue): the RLS user id was kept in thread-local storage, threads were reused, and requests ran under a previous request's identity. The fix was resetting context after each response. — [Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- Bytebase warns that clients must not be able to set the tenant variables themselves. Behind a pooler all connections share one role, so `current_user` can't identify the tenant. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)

### Inferences
- Even without PgBouncer, postgres.js keeps its own pool (default `max: 10`, per the [README](https://github.com/porsager/postgres)). A session-level `SET app.tenant_id` on one pooled connection would persist into the next unrelated query on that connection. `is_local = true` inside `sql.begin` / `db.transaction` is the only safe pattern.
- Recommended policy predicate (fail-closed on unset, empty or garbage values): `organisation_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid`. An empty or unset value yields NULL, and NULL = x is NULL, so no rows are visible and inserts fail WITH CHECK. A malformed non-UUID string raises a cast error, which also fails closed. If organisation_id is text, drop the cast but keep NULLIF.
- Always pass the tenant id as a bound parameter (`set_config('app.tenant_id', $1, true)`), never by string interpolation into `SET LOCAL ...`. SET can't take bind parameters, which is one reason to prefer set_config.

### Gaps
- I didn't verify whether PgBouncer's `track_extra_parameters` (newer versions) changes this picture for custom GUCs. Assume it does not for `app.*` settings.

## 4. Roles: non-owner app role, privileged migration/admin role

### Takeaway
Use three roles: an owner or migrator role that owns the tables and runs migrations (never used by the request path), a NOLOGIN-free app role with only DML grants that is not owner, not superuser and not BYPASSRLS, and optionally a separate BYPASSRLS role for platform admin or cross-tenant jobs. Add FORCE RLS as a belt-and-braces measure in case something ever connects as the owner. Use ALTER DEFAULT PRIVILEGES FOR ROLE the migrator so new tables are automatically granted to the app role.

### Cited Findings
- Owners bypass RLS unless FORCE is set, and superusers and BYPASSRLS roles always bypass it. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Tests run as the superuser or table owner can falsely pass, so test as a non-superuser app role (`SET ROLE`) and never grant BYPASSRLS to application roles. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- The Nile team's app connected as a privileged role during testing, which silently bypassed RLS. The fix was to run the app as a non-bypassing `app_user`. — [Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- Crunchy prefers one shared `application` role plus a session variable over a DB role per tenant ("a lot of overhead" and it defeats connection pooling). — [Crunchy Data](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- Supabase's `service_role` has `bypassrls` and is for admin only. You can grant BYPASSRLS to custom roles with `ALTER ROLE ... WITH BYPASSRLS`. — [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- `ALTER DEFAULT PRIVILEGES` affects only future objects. `FOR ROLE target_role` applies to objects *created by* that role, and defaults are "not inherited from any roles in which the current role is a member". Per-schema defaults add to global ones. Example: `ALTER DEFAULT PRIVILEGES FOR ROLE admin IN SCHEMA myschema GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO webuser;` and `... GRANT USAGE ON SEQUENCES TO webuser;` — [PG16 docs: ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/16/sql-alterdefaultprivileges.html)
- A SECURITY DEFINER function owned by a BYPASSRLS role (for example `postgres`) skips RLS, while one owned by a role without BYPASSRLS does not. — [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Inferences
Suggested setup (synthesised from the docs above; adapt names):
```sql
-- owner/migrator: owns schema objects, runs drizzle-kit migrations
CREATE ROLE app_owner LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
-- request-path role: DML only
CREATE ROLE app_user  LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
-- optional: platform admin / cross-tenant jobs, used only by separate trusted code paths
CREATE ROLE app_admin LOGIN PASSWORD '...' NOSUPERUSER BYPASSRLS;

GRANT USAGE ON SCHEMA public TO app_user, app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, app_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, app_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, app_admin;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;  -- app_user cannot create objects it would own

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON records
  AS PERMISSIVE FOR ALL TO app_user
  USING (organisation_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```
- Migrations must run as `app_owner`. If drizzle-kit connects as `app_user`, it can't create tables. If the app connects as `app_owner`, RLS is bypassed unless FORCE is set. Two connection strings (DATABASE_URL for the app, MIGRATION_DATABASE_URL for drizzle-kit) make the separation explicit.
- Not every relational table is tenant-scoped. `users` (global identity), `sessions` and `tokens` are usually looked up *before* the tenant is known, for example during authentication. Those tables need either a different policy (for example keyed on a `app.user_id` setting), access only via narrowly scoped SECURITY DEFINER functions owned by a non-BYPASSRLS role with fixed search_path, or deliberate exclusion from RLS, protected by grants and app logic. This must be designed per table. `memberships` and `files` are naturally org-scoped.

### Gaps
- Managed-provider specifics (for example RDS `rds_superuser`, Neon or Supabase default roles owning tables) were not researched. Check who owns the tables in the actual deployment.

## 5. Drizzle ORM and postgres.js implementation

### Takeaway
Drizzle can declare RLS and policies in schema (`pgTable.withRLS`, `pgPolicy`, `pgRole(...).existing()`), and drizzle-kit generates the DDL. Tenant context isn't automatic: wrap each request's DB work in `db.transaction(async tx => { await tx.execute(sql\`select set_config('app.tenant_id', ${orgId}, true)\`); ... })`. That is the same pattern Drizzle's own Supabase `createDrizzle` example uses. With postgres.js, `sql.begin` reserves one connection for the callback, so the setting and the queries share a connection.

### Cited Findings
- Drizzle: `pgTable.withRLS('users', {...})` keeps RLS enabled whether or not policies exist. The older `.enableRLS()` is deprecated in v1. With plain `pgTable`, drizzle-kit enables RLS when a table has policies and *disables it when the last policy is removed*. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)
- `pgPolicy(name, { as: 'permissive'|'restrictive', to, for: 'all'|'select'|'insert'|'update'|'delete', using, withCheck })` is passed in the table's third argument. `.link(table)` attaches a policy to an existing table. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)
- `pgRole('name', {...})` defines roles, and `.existing()` marks a role as external (not managed by migrations). Role management is off by default and is enabled with `entities: { roles: true }` (with `include`, `exclude` and `provider` options) in drizzle.config.ts. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)
- Drizzle views: `pgView(...).with({ securityInvoker: true })` makes policies apply to views. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)
- Drizzle's Supabase example `createDrizzle(token, { admin, client })` runs inside `client.transaction`. It calls `set_config('request.jwt.claims', ..., TRUE)`, runs `set local role ...`, runs the callback, and in `finally` resets the claims and role. The example interpolates via `sql.raw`, which is safe only for verified data. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)
- postgres.js `sql.begin`: "Postgres.js will reserve a connection for the transaction and supply a scoped `sql` instance". You must use that scoped `sql`. A failed query aborts the whole transaction, and nested `begin` becomes a savepoint. — [postgres.js README](https://github.com/porsager/postgres)
- postgres.js with PgBouncer transaction mode: use `prepare: false` unless PgBouncer ≥1.21 with `max_prepared_statements` set (default 200 in PgBouncer). — [postgres.js README](https://github.com/porsager/postgres); [PgBouncer config](https://www.pgbouncer.org/config.html)

### Inferences
Illustrative helper (not from a single source; built from the documented APIs):
```ts
import { sql } from 'drizzle-orm';
export async function withTenant<T>(orgId: string, fn: (tx: Tx) => Promise<T>) {
  if (!isUuid(orgId)) throw new Error('missing tenant');          // fail closed in app too
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${orgId}, true)`); // bound param, txn-local
    return fn(tx);
  });
}
```
- Every query in the request must use `tx`, not the global `db`. A stray `db.select()` runs on a different pooled connection with no tenant set and returns zero rows. That fails closed, but shows up as a confusing "missing data" bug. A lint rule or a repository layer that only accepts `tx` helps.
- Because `is_local = true` settings die at COMMIT or ROLLBACK, the Supabase example's `finally` reset is belt-and-braces rather than required. It is cheap, though.
- If the code base uses plain `pgTable` with `pgPolicy`, prefer `pgTable.withRLS` for tenant tables so a policy refactor can't silently turn RLS off via a generated migration. Add `FORCE ROW LEVEL SECURITY` in a custom SQL migration if drizzle-kit doesn't emit it.

### Gaps
- I didn't confirm from Drizzle docs that Drizzle's postgres-js `db.transaction` is implemented on `sql.begin` (it is widely assumed). I also didn't confirm whether drizzle-kit can emit `FORCE ROW LEVEL SECURITY`. The fetched docs mention no FORCE option.
- Drizzle's relational query API (`db.query.*`) behaviour inside `tx` wasn't separately checked.

## 6. Defence in depth and testing

### Takeaway
Keep explicit `WHERE organisation_id = ?` scoping in the application and treat RLS as the safety net that catches the forgotten filter. Test RLS as the real app role (never as superuser or owner), and cover cross-tenant SELECT, UPDATE, DELETE and INSERT, plus the "no tenant set" case.

### Cited Findings
- Tests run as superuser or owner falsely pass. Use `SET ROLE` to the app role. `row_security_active('table')` and `SET row_security = off` help debugging. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Nile ran integration tests against a Postgres Testcontainer through real API endpoints, as the non-bypassing `app_user`. They log tenant and user ids wherever context is set, read or reset, because policy evaluation can't be logged directly. An overly permissive policy is hard to catch without thorough tests. — [Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- Azure: RLS requires propagating tenant identity into every query and is "complex to design, implement, test, and maintain". — [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- A policy with only USING (for example `FOR SELECT`) lets users insert rows they can't read back. Use WITH CHECK with the same tenant condition. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)

### Inferences
Suggested test matrix (run as `app_user`):
1. Tenant A context: SELECT returns only A rows. SELECT by B's primary key returns 0 rows.
2. UPDATE or DELETE of B's row by id affects 0 rows, and `RETURNING` is empty.
3. INSERT with `organisation_id = B` while in A context raises a WITH CHECK violation (error code 42501).
4. UPDATE that changes `organisation_id` from A to B raises an error.
5. No tenant set (plain query outside `withTenant`) returns 0 rows, and INSERT fails.
6. The tenant setting does not survive to the next transaction on the same connection: run tx1 with A, then tx2 without setting it on a single reserved connection, and expect 0 rows.
7. Catalog assertion test: query `pg_class` for every table with an `organisation_id` column and assert `relrowsecurity AND relforcerowsecurity` and at least one policy. Assert that the app role has `rolbypassrls = false`, `rolsuper = false` and owns no tables (via `pg_roles` / `pg_tables.tableowner`). This catches new tables added without RLS.
8. Views: assert that every view over tenant tables has `security_invoker=true` in `pg_class.reloptions`.

### Gaps
- No vendor-published standard RLS test suite was found. The matrix above is synthesised.

## 7. Known pitfalls: views, SECURITY DEFINER, unique constraints, sequences, FKs, COPY, materialised views

### Takeaway
RLS protects base-table row access by the querying role only. Anything that runs as another role (default views, SECURITY DEFINER functions), copies data out (materialised views, COPY, exports, background jobs) or performs internal integrity checks (unique, PK and FK) can bypass it or leak existence.

### Cited Findings
- Views: by default, base-table permissions *and RLS policies* are those of the view owner. With `security_invoker = true` (PG15+, so available on PG16), the invoking user's policies apply. — [PG16 docs: CREATE VIEW](https://www.postgresql.org/docs/16/sql-createview.html). Views typically bypass RLS because they're created by `postgres`. — [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- `security_barrier` makes view WHERE conditions evaluate before user-supplied conditions (except LEAKPROOF ones), and is intended for views that provide row-level security. — [PG16 docs: CREATE VIEW](https://www.postgresql.org/docs/16/sql-createview.html)
- SECURITY DEFINER functions run with the owner's rights. A policy expression "can use security-definer functions to access data not available to the calling user". A definer function owned by a BYPASSRLS role skips RLS entirely, so set `search_path = ''` and schema-qualify names. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html); [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). Nile used SECURITY DEFINER to break recursive policies but warns that such functions must be written carefully. — [Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- Unique, PK and FK checks "always bypass row security". A failed duplicate-key insert reveals that a value exists, and a successful insert into a referencing table reveals that the referenced value exists. The PG docs suggest generated surrogate keys and policies that block revealing writes. — [PG16 docs: Row Security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html); [CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- Scope unique indexes per tenant, for example `CREATE UNIQUE INDEX ... ON users(tenant_id, lower(email))`, so duplicate-key errors don't reveal another tenant's data. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- FK failures: if RLS hides the parent row, a valid child insert can fail with an FK violation (per Bytebase), so the parent needs a SELECT policy permitting the check. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/). Note: the PG docs say FK checks bypass RLS, so this claim may apply mainly to app-level pre-checks or to FK actions. Treat it as unverified. — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Materialised views, `COPY` to file, exports and background jobs: copied data is no longer protected by policies, and `SELECT *` into a materialised view exposes all tenants. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/). SELECT policies apply to `COPY ... TO`. — [PG16 docs: CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- Column-level: "RLS works on rows, not columns". Use column REVOKE or views for sensitive fields. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Timing side channels and planner statistics: CVE-2019-10130 leaked RLS-hidden rows via planner statistics (fixed in 9.5.17, 9.6.13, 10.8 and 11.3). Query timing can reveal hidden rows' existence. — [Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- Policies with sub-SELECTs can leak under concurrent updates (READ COMMITTED snapshot race). — [PG16 docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- Drizzle-specific: with plain `pgTable`, removing the last policy makes drizzle-kit *disable* RLS on the table. — [Drizzle RLS docs](https://orm.drizzle.team/docs/rls)

### Inferences
- For the JSONB table, a PK of (organisation_id, kind, id) is already tenant-scoped, so duplicate-key errors on it can't reveal other tenants' ids. Any *global* unique constraint (for example on `users.email`, a token hash, a file storage key or a slug) still leaks existence across tenants. That is often acceptable for global identity (email), but it should be a conscious decision.
- Sequences are not covered by RLS. A shared `serial` / identity column exposes a global counter, which reveals other tenants' activity volume and makes IDs guessable. UUIDs (v4, or v7 for index locality) are preferable for tenant-visible IDs. This inference is consistent with the PG docs' "use surrogate keys" advice, but it is not stated about sequences there.
- Foreign keys across tables should include organisation_id in composite FKs (for example `(organisation_id, user_id) REFERENCES memberships(organisation_id, user_id)`). Then a row in tenant A can't reference tenant B's parent even if app code passes a wrong id, because integrity checks bypass RLS.
- Background jobs, cron and queue workers must call the same `withTenant` wrapper per tenant, or deliberately use the BYPASSRLS admin role in audited code. Any reporting or materialised view should be a security_invoker view instead, or be built per tenant.

### Gaps
- The `COPY FROM` interaction with RLS was not confirmed from docs in this pass. (My recollection is that the COPY docs say COPY FROM is not supported on RLS-enabled tables. Verify this at https://www.postgresql.org/docs/16/sql-copy.html.)
- No public post-mortem of a production cross-tenant leak caused specifically by session-level SET with PgBouncer was found. The evidence is community guides plus the Nile thread-local incident, which is an app-layer analogue.
- Whether `REFRESH MATERIALIZED VIEW` applies RLS as the view owner (making it an all-tenant copy) was not verified from docs.
