# Secure RBAC Design for Multi-Tenant B2B SaaS (Next.js App Router + Node.js API)

Scope note: research was done in November 2026 against primary standards (NIST, OWASP ASVS 5.0.0, OWASP Top 10:2025, OWASP API Top 10 2023, OWASP cheat sheets), framework docs (Next.js, Vercel) and vendor docs (GitHub, Slack, Auth0, WorkOS, Kubernetes as a reference design for escalation prevention). Where I fell back on community or practitioner sources, I say so.

## 1. Roles vs permissions: the NIST model, checking permissions instead of role names, and when to add ABAC/ReBAC or ownership checks

### Takeaway
NIST RBAC treats a role as a named bundle of permissions. Core RBAC is mandatory. Role hierarchies and static or dynamic separation of duty are optional components that can be added independently. OWASP now recommends that application code evaluate specific permissions and attributes (ABAC or ReBAC) rather than test for role names. Role checks are too coarse for object-level decisions and handle multi-tenancy poorly. The practical pattern is roles for administration, permissions at the enforcement point, and relationship or attribute checks for object-level decisions.

### Cited Findings
- The NIST/ANSI RBAC standard is INCITS 359-2004. It consists of a reference model plus a functional specification. "Core RBAC is required in any RBAC system." — [NIST CSRC RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- Core RBAC covers user-role assignment, permission-role assignment and activating roles within a session. Permissions attach to roles, never directly to users, and a role is "essentially a collection of permissions". — [NIST CSRC RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- Hierarchical RBAC adds role hierarchies and introduces the notions of a role's authorised users and authorised permissions. — [NIST CSRC RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- Static Separation of Duty (SSD) limits which roles a single user can be assigned. Dynamic Separation of Duty (DSD) limits which roles can be active together in one session. SSD is defined both with and without hierarchies because inherited roles can conflict with SSD. The three optional components (hierarchy, SSD, DSD) are independent. — [NIST CSRC RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- NIST SP 800-162 (January 2014, updated through 2019) defines ABAC as determining authorisation by evaluating attributes of the subject, the object, the requested operation and sometimes environment conditions against policy, rules or relationships. — [NIST SP 800-162 CSRC page](https://csrc.nist.gov/pubs/sp/800/162/upd2/final); [NIST publication abstract](https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations-1)
- OWASP: "ABAC and ReBAC should typically be preferred for application development". It gives five reasons: fine-grained logic, robustness (role checks are easy to miss or chain incorrectly), speed (role explosion and per-request role fetching), multi-tenancy (RBAC handles cross-organisation access poorly) and manageability. — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- OWASP notes that RBAC decides access by the presence or absence of roles, which is too coarse for object-level decisions. Code should evaluate the specific permissions or attributes relevant to each request. — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- ASVS 5.0 V8.1.1 (L1) requires authorisation documentation that defines function-level and data-specific access rules based on consumer permissions and resource attributes. V8.1.2 (L2) extends this to field-level read and write rules, which may depend on state or status. — [OWASP ASVS 5.0.0 V8](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x17-V8-Authorization.md)
- OWASP Top 10:2025 A01 recommends "enforce record ownership" rather than letting users access any record. — [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)
- WorkOS RBAC supports organisation-scoped custom roles, mapping identity provider groups to roles via SSO and Directory Sync, and enforcement via session JWTs. This shows that per-tenant custom roles are a mainstream B2B expectation. — [WorkOS RBAC docs](https://workos.com/docs/rbac)

### Inferences
- For a recruitment SaaS, a sensible model has three layers:
  1. **Roles** for administration: org_admin, hr_manager, recruiter, hiring_manager.
  2. **Permissions** at the code choke point, for example `job.create`, `candidate.read`, `candidate.read_sensitive`, `offer.approve`, `member.invite`, `role.assign`, `billing.manage`.
  3. **Relationship or attribute checks**, for example that a hiring manager may only see candidates for requisitions they are assigned to, or that a recruiter may only edit jobs in their department or that they own.
- Code should call `can(user, 'candidate.read', candidate)` and never `if (role === 'recruiter')`. Renaming roles or adding custom roles then needs no code change.
- Separation of duty maps well onto recruitment. Examples: the person who creates an offer should not be the sole approver (DSD-like), and hiring-manager feedback should not be editable by the recruiter.
- Keep a single role per membership, or a small set, until customers ask for custom roles. NIST hierarchies (org_admin ⊇ hr_manager ⊇ recruiter) can be expressed as permission-set unions without a general hierarchy engine.
- ASVS 8.1.1 makes a written permission matrix (role × permission × resource condition) an L1 deliverable, not optional documentation.

### Gaps
- I did not retrieve the full text of INCITS 359-2012 (the revised standard). The CSRC FAQ page cites only the 2004 version.
- I found no authoritative vendor post (GitHub, Stripe, Slack) that explicitly explains "check permissions not roles" in its own architecture. The claim rests on OWASP.
- An Oso multi-tenancy guide URL returned a 404, so no Oso content is included.

## 2. Enforcement: deny by default, a single central choke point, server-side checks on every request, and what OWASP API1/API5 and ASVS 5.0 V8 require

### Takeaway
Every relevant standard says the same thing. Deny by default. Implement authorisation once in a central, reusable module. Run it server-side on every request for both the function and the specific object (and field). Never treat UI hiding, middleware or proxy as the control. In Next.js, the official model is a server-only Data Access Layer (DAL) that both Server Actions and Route Handlers call, with Proxy (formerly middleware) used only for optimistic redirects. CVE-2025-29927 showed why middleware alone is unsafe.

### Cited Findings
**OWASP Authorization Cheat Sheet**
- Deny by default, and prefer explicit configuration over framework defaults. Validate permissions on every request, including AJAX and server-side calls ("an attacker only needs to find one way in"). Prefer enforcement mechanisms with global, application-wide configuration over per-method checks. Centralise how failed checks are handled. — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- "Developers must never rely on client-side access control checks." Do not rely on hidden or randomised IDs; check access "on every request for the specific object or functionality being accessed". — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- Write unit and integration tests for authorisation logic, including deny-by-default and fail-safe behaviour. These do not replace manual testing (WSTG 4.5). — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

**OWASP API Security Top 10 2023**
- API5 (Broken Function Level Authorization) recommends:
  - one consistent, easy-to-analyse authorisation module that every business function invokes;
  - "deny all access by default", with explicit grants per function;
  - admin controllers that inherit from an admin abstract controller that checks role or group.
- An API5 example is directly relevant to invitations. An attacker changes `GET /api/invites/{guid}` to `POST /api/invites/new`, which has no function-level check, issues an admin invite and takes over the account. — [OWASP API5:2023](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization)
- API1 (BOLA) recommends checking, in every function that uses client input to access a record, that the logged-in user may perform the requested action on that record. Comparing the session user ID with the ID parameter is not sufficient on its own. Use random IDs (GUIDs) and authorisation tests, and do not deploy changes that make those tests fail. — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)

**OWASP ASVS 5.0.0 V8**
- 8.2.1 (L1): function-level access is restricted to consumers with explicit permissions.
- 8.2.2 (L1): data-specific access is restricted to consumers with explicit permission for specific data items (IDOR/BOLA).
- 8.2.3 (L2): field-level access is restricted to consumers with explicit permissions for specific fields (BOPLA).
- 8.3.1 (L1): authorisation rules are enforced at a trusted service layer, not in client-side JavaScript.
- 8.4.1 (L2): multi-tenant apps use cross-tenant controls so a consumer's operations never affect tenants they have no permission to interact with.
- 8.3.3 (L3): decisions use the originating consumer's permissions, not an intermediary service's.
- 8.4.2 (L3): admin interfaces need multiple layers (continuous identity verification, device posture, contextual risk). Network location alone is not sufficient.
- Source for all of the above: [OWASP ASVS 5.0.0 V8](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x17-V8-Authorization.md)

**OWASP Top 10:2025 A01 (Broken Access Control)**
- Ranked #1. "100% of the applications tested were found to have some form of broken access control." 40 CWEs are mapped, with 1,839,701 occurrences and 32,654 CVEs.
- Prevention items: deny by default; implement access control once and reuse it; enforce record ownership; log access-control failures and alert on repeated failures; rate-limit APIs; use declarative toolkits.
- Common flaws listed include APIs missing access controls on POST, PUT and DELETE, and force browsing.
- Source: [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)

**Next.js official guidance**
- There are two kinds of check. Optimistic checks read the session cookie (for UI and redirects). Secure checks use database-backed session data.
- Next.js recommends a server-only DAL that centralises data requests and authorisation logic, plus DTOs that return only the necessary fields. — [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- Proxy (formerly middleware) "should not be your only line of defense". Most checks should be "as close as possible to your data source". — [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- Layouts do not re-render on navigation, so session checks there do not run on every route change. A layout that hides children does not stop nested segments or parallel slots from running or appearing in the RSC payload. Returning `null` in a layout is "not recommended", because Next.js has multiple entry points. — [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- Server Actions and Route Handlers should be treated "with the same security considerations as public-facing API endpoints". Each must check authorisation itself, because UI restrictions are not sufficient. React `cache` does not deduplicate in Server Actions or Route Handlers, so every call runs the check. — [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)

**CVE-2025-29927 (Next.js middleware bypass)**
- An attacker could send the internal `x-middleware-subrequest` header to skip middleware entirely. Self-hosted `next start` and `output: 'standalone'` deployments were affected. Vercel, Netlify and Cloudflare Workers were not.
- Fixed in 14.2.25 and 15.2.3 (17–18 March 2025), with backports to 13.5.9 and 12.3.5. Vercel's postmortem states middleware should not be the only route protection.
- Source: [Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

### Inferences
- The choke point for Next.js plus a Node API should be a server-only `authz` module (DAL). It takes `{ principal, orgId, action, resource }` and every Server Action, Route Handler and API controller calls it before touching data.
- Make it impossible to fetch tenant data without the module. One approach is a repository layer whose methods require an authorisation context and always add `WHERE org_id = ctx.orgId`. Optionally add Postgres row-level security as defence in depth for ASVS 8.4.1.
- Do not read `orgId` from the request body or URL as a source of truth. Resolve it from the authenticated membership, or validate the URL org slug against the user's memberships.
- Return 404 rather than 403 for cross-tenant object IDs, so object existence does not leak. Return 403 within a tenant when the function is forbidden.
- Add a CI test matrix (role × endpoint × own-tenant/other-tenant object) that asserts denials. OWASP API1 explicitly says not to deploy when these tests fail.
- The DTO and field-level layer (ASVS 8.2.3) matters for recruitment data. Examples are salary expectations, diversity data, right-to-work documents and interview feedback. A hiring manager may see a candidate record but not every field.

### Gaps
- I found no published GitHub, Stripe or Slack engineering post describing their central authorisation service architecture within this search budget.

## 3. Least privilege, default role sets, and separating org admins from platform super-admins and support staff

### Takeaway
Grant the minimum privileges by default and review for privilege creep. Platform-staff access to a tenant should be a separate, exceptional path. It should require a recorded reason, expire automatically, be clearly marked in the session, and be fully audited. WorkOS's impersonation design (a required reason, a 60-minute expiry and an `impersonator` field on the session) is a concrete reference. ASVS L3 additionally calls for multi-layer protection of admin interfaces.

### Cited Findings
- Give users "only the minimum privileges necessary to complete their job", both horizontally and vertically. Map user types, resources and operations at design time, and review permissions after deployment for privilege creep. — [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- OWASP Top 10:2025 lists violating least privilege (access open to anyone that should be role-restricted) as a core A01 pattern. — [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)
- WorkOS impersonation:
  - The operator must give a reason, which is recorded on the `session.created` event.
  - Impersonation sessions expire after 60 minutes.
  - The session's authenticate response includes an `impersonator` field.
  - Only environment Admins can enable impersonation.
  - Source: [WorkOS AuthKit impersonation docs](https://workos.com/docs/authkit/impersonation)
- WorkOS's blog on support impersonation and delegated sessions covers keeping the audit trail when support acts as a user. I saw this only in a search snippet and did not fetch the full post. — [WorkOS blog: support impersonation](https://workos.com/blog/support-impersonation-delegated-sessions)
- GitHub Enterprise Server documents admin "impersonating a user" as a distinct, logged admin capability. I saw this only in a search snippet. — [GitHub Docs: impersonating a user](https://docs.github.com/en/enterprise-server@3.21/admin/managing-accounts-and-repositories/managing-users-in-your-enterprise/impersonating-a-user)
- The OWASP Logging Cheat Sheet requires logging all actions by system and application administrators, and use of default, shared or "break-glass" accounts. — [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- ASVS 8.4.2 (L3): admin interfaces should use continuous identity verification, device posture and contextual risk, not network location alone. ASVS 8.3.3 (L3): use the originating consumer's permissions, not the intermediary's. — [OWASP ASVS 5.0.0 V8](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x17-V8-Authorization.md)

### Inferences
- Suggested default role set for recruitment. This is my design inference, not from a source.

| Role | Permissions |
|---|---|
| org_admin | Members, roles, billing, SSO, data retention settings, plus all HR permissions. Two or more recommended. |
| hr_manager | All requisitions, candidates and offers; approve offers; configure pipelines and templates; export reports. No billing or SSO. |
| recruiter | Create and edit requisitions they own or are assigned to; manage candidates on those; schedule interviews; send candidate messages. No offer approval or member management. |
| hiring_manager | Read candidates on requisitions they are assigned to; submit and read scorecards; request offers. No exports, no access to other requisitions, limited sensitive fields. |
| interviewer (optional) | Own interview slots and scorecards only. |

- New invitees should default to the least-privileged role (for example hiring_manager or interviewer), never admin.
- Platform staff should not be tenant members with an org_admin role. Use a separate identity realm, a separate permission namespace (`platform.*`) and a separate admin app or route group. Grant cross-tenant access only through an explicit, time-boxed "support session" record that stores the staff ID, tenant, reason, ticket link, expiry and (ideally) customer consent. Every action in that session should be stamped with both `actor=staff` and `on_behalf_of=user` (consistent with ASVS 8.3.3 and the WorkOS `impersonator` field).
- Block or extra-gate destructive actions during impersonation, such as changing roles, exporting candidate data or deleting records. Show a persistent banner in the UI.

### Gaps
- I did not retrieve vendor documentation on customer-consented support access (for example Atlassian or Okta "support access" toggles) within the budget. The consent requirement is therefore an inference, not a cited finding.

## 4. Privilege escalation: self-granting, granting more than you hold, last-admin protection, re-authentication, and who may edit role definitions

### Takeaway
The cleanest published rule comes from Kubernetes RBAC. A principal may only create or edit a role, or assign a role, if they already hold every permission in it, unless they have an explicit escalate or bind privilege. Combine this with:
- no self-role changes (GitHub: owners cannot change their own role);
- a minimum of one, and ideally two, owners (GitHub recommends two; Slack's primary owner cannot be deactivated until ownership is transferred);
- step-up re-authentication for membership and role changes (GitHub sudo mode covers invitations, adding members and changing team roles, for 2 hours).

### Cited Findings
- Kubernetes: a user can only create or update a Role "if at least one" of these is true: they already hold all its permissions at the same scope, or they have the `escalate` verb on roles. They can only create a role binding if they hold all the permissions in the referenced role or have the `bind` verb on it. Otherwise the API returns forbidden. — [Kubernetes RBAC docs](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- Kubernetes shows a "role-grantor" pattern that lets a user grant only named roles (admin, edit, view) in one namespace via `bind` with `resourceNames`. — [Kubernetes RBAC docs](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- GitHub recommends at least two people with the owner role in each organisation. An owner can change other members' and owners' roles but cannot change their own role. — [GitHub Docs: ownership continuity](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization)
- Slack: no one can deactivate the workspace primary owner, who must first transfer ownership. Only the primary owner can delete the workspace or transfer ownership. — [Slack: Deactivate a member's account](https://slack.com/help/articles/204475027-Deactivate-a-members-account); [Slack: primary owner role](https://slack.com/intl/en-gb/help/articles/360038161033-Understand-the-primary-owner-role)
- GitLab has a public design issue to prevent removal of the last organisation owner, which shows the issue is a recognised product requirement. — [GitLab issue 441282](https://gitlab.com/gitlab-org/gitlab/-/issues/441282)
- GitHub sudo mode re-prompts for authentication before sensitive actions, including sending org invitations, adding members, changing team roles and changing 2FA enforcement. It lasts 2 hours, and each sensitive action resets the timer. SMS 2FA codes are not accepted for sudo. — [GitHub Docs: sudo mode](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/sudo-mode)
- OWASP Session Management: "The session ID must be renewed or regenerated by the web application after any privilege level change". Applications should require re-authentication after high-risk events. — [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- OWASP Top 10:2025 lists privilege escalation ("acting... exceeding the user's expected privileges") and JWT or cookie metadata tampering as A01 patterns. — [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)

### Inferences
Concrete rules for the membership and role API:
- `assignRole(actor, target, role)` requires `member.role.assign`, and `permissions(role) ⊆ permissions(actor)`. This is the Kubernetes rule.
- Reject `actor.id === target.id` for role changes.
- In the same database transaction, refuse any change that would leave zero active org_admins: a demotion, a removal, a deactivation, or the last admin leaving. Use `SELECT ... FOR UPDATE` on the org's admin memberships to avoid races between two concurrent demotions.
- Only org_admin (or a dedicated `role.define` permission) may create or edit custom role definitions. The same subset rule applies, so an admin cannot create a role containing `platform.*` permissions. Platform permissions should not be assignable through tenant APIs at all.
- Require recent authentication (for example within the last 5–15 minutes, or a GitHub-style sudo window) for invitations with elevated roles, role changes, member removal, SSO configuration and data export.
- Treat role and membership changes as privilege-level changes for the affected user (see section 5).
- Validate the role value server-side against an allow-list for the org. An unvalidated `role` field on invite or update endpoints is the API5 attack shown in section 2.

### Gaps
- I found no primary vendor documentation (GitHub, Stripe) that publicly specifies the subset-of-own-permissions rule for SaaS role assignment. Kubernetes is the authoritative documented reference.

## 5. Membership lifecycle: invitations, accepting into the right tenant, deactivation, and revoking or re-checking sessions on role change or removal

### Takeaway
An invitation is an access grant and should be treated like a credential. It should be unguessable, stored hashed, single-use, expiring, bound to the invited email (and verified on acceptance), and bound to a specific tenant and role. It should be revocable, and removing a member should invalidate it. For role changes and removals, ASVS 8.3.2 (L3) asks for changes to take effect immediately. In practice that means a server-side lookup of membership and role on each request (a database session or a cached membership with fast invalidation), not long-lived JWT role claims. If JWTs are used, OWASP says to keep them short-lived.

### Cited Findings
- Auth0 Organizations: the invited user must log in or sign up with the email the invitation was sent to, and that email is marked verified on acceptance. The link carries the `invitation` ticket ID and `organization` ID to the authorise endpoint. Roles can be pre-assigned and apply only when logging in through that organisation. Unaccepted invitations expire and are eventually deleted. — [Auth0: invite organization members](https://auth0.com/docs/manage-users/organizations/configure-organizations/invite-members)
- CVE-2025-66223 (per Rapid7): a product's invitation tokens never expired, stayed valid after the invitee was removed, and allowed several invites to one email with different roles. It was fixed in version 0.16.0. — [Rapid7 CVE-2025-66223](https://www.rapid7.com/db/vulnerabilities/cve-2025-66223/)
- Practitioner sources (not standards):
  - Use unguessable invite tokens, because derivable IDs let attackers enumerate and accept pending invites; binding to the invited email is the control most often missed. — [Safeguard: the invitation flow is an access grant](https://www.safeguard.sh/resources/blog/the-invitation-flow-is-an-access-grant)
  - Store only a SHA-256 digest of the token. — [Sigra Invitations docs](https://hexdocs.pm/sigra/Sigra.Organizations.Invitations.md)
  - Consume the token on first acceptance; a researcher found one token reused to add several emails. — [Medium: invitation hijacking](https://medium.com/@vflexo/invitation-hijacking-4d6467f418cc)
  - Bind the tenant ID and intended role in the token. — [DEV: tenant-bound magic links](https://dev.to/sophiax99/tenant-bound-magic-links-for-saas-invites-5g84)
  - A write-up describes recursive organisation takeover via the invitation flow (org-ID swapping). — [Recursive Org Takeover write-up](https://kareemelsadek.github.io/posts/Recursive-OrgTakeover)
- OWASP API5:2023's example attack is privilege escalation through an unprotected invite-creation endpoint (an admin-role invite). — [OWASP API5:2023](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization)
- ASVS 8.3.2 (L3): changes to values on which authorisation decisions are made take effect immediately. Where that is impossible, there must be mitigating controls that alert on and revert unauthorised actions, noting that this does not prevent information leakage. — [OWASP ASVS 5.0.0 V8](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x17-V8-Authorization.md)
- OWASP Top 10:2025: invalidate server-side session identifiers after logout. Keep stateless JWTs short-lived and use refresh tokens for longer access. — [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)
- OWASP Session Management:
  - Regenerate the session ID after any privilege level change and destroy the old one.
  - Server-side invalidation is "mandatory from a security perspective".
  - Use idle timeouts (2–5 minutes for high-value apps, 15–30 minutes for low-risk ones) and an absolute timeout (about 4–8 hours for all-day office apps), enforced server-side.
  - Provide features to view and remotely terminate active sessions.
  - Source: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Next.js docs say database sessions are "more secure" and enable "log out of all devices". Secure checks should compare the session against the database. Optimistic cookie-only checks are for UI and redirects only. The Next.js example JWT session has a 7-day expiry, which is too long to rely on for role claims. — [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- WorkOS exposes session listing (`GET /user_management/users/:id/sessions`) and on-demand revocation (`POST /user_management/sessions/revoke`). This is from a WorkOS blog summarised in search results, not fetched directly. — [WorkOS blog: impersonation and bearer-token sessions](https://workos.com/blog/impersonation-bearer-token-sessions)

### Inferences
**Invitation model.** Fields: `invitations(id, org_id, email_normalised, role_id, token_hash, invited_by, expires_at, accepted_at, revoked_at)`. On acceptance:
1. Hash the presented token and look it up.
2. Check it is not expired, accepted or revoked.
3. Require the authenticated user's verified email to equal `email_normalised`.
4. Check the inviter still holds `member.invite`, and that `role ⊆ inviter's permissions`, at acceptance time as well as at creation.
5. Create the membership for that `org_id` only, never an org ID from the request.
6. Mark the invitation accepted, in one transaction.

Expire invitations after 7 days or less. Revoke pending invites when the inviter is removed, or when an invite for the same email is re-issued.

**Recommended session strategy for a small team.** Keep the session (DB-backed or short-lived token) as the record of identity only. Resolve `membership(user, org)`, including role and status, from the database on every Server Action, Route Handler and API request. Optionally cache it for a few seconds with explicit invalidation on change. Do not put roles in a long-lived JWT. If roles are in a JWT, keep access tokens to about 5–15 minutes and check a membership `version` or `revoked_at` value server-side.

**On removal or deactivation:**
- set `membership.status = 'removed'` (soft delete for audit);
- delete or revoke all of that user's sessions scoped to that org (or all sessions if single-org);
- revoke their API keys and OAuth tokens for that org;
- cancel invitations they issued that are still pending.

**On role change:** bump the membership version so the next request re-reads the role. Rotate the session ID if the role was elevated, in line with the OWASP privilege-change guidance.

**Users in multiple orgs:** the active org must be explicit per request (URL slug or header) and validated against memberships. Never use a "last org" cookie that is trusted blindly.

### Gaps
- I did not confirm Auth0's default or maximum invitation TTL; the fetched page does not state it.
- I found no OWASP or NIST standard specifying invitation token lifetimes. The 7-day figure comes from vendor or practitioner examples only.

## 6. Audit logging of permission and role changes

### Takeaway
Log every authorisation failure and every user-administration event: invites, membership changes, privilege grants and revocations, role-definition edits, admin and impersonation actions, and exports. Record who, what, when, where, the object, the result and the reason. Exclude secrets and session tokens. Make logs tamper-evident and append-only, with separate write credentials.

### Cited Findings
- Events to log:
  - authorisation (access control) failures;
  - session-management failures such as JWT or cookie tampering;
  - user administration (adding or deleting users, changing privileges, assigning users to tokens);
  - all system and application administrator actions;
  - use of default, shared or break-glass accounts;
  - data import and export.
  - Source: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Attributes: "when, where, who and what". That covers event and log timestamps, an interaction or correlation ID, app name and version, entry point, source IP or device, user identity, event type, severity and description. Recommended extras are action, object, result status, reason and user type. — [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Exclude or mask session IDs (a hash is acceptable), access tokens, passwords, keys and sensitive PII. Pseudonymise where identity is not needed. — [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Integrity guidance:
  - "Build in tamper detection so you know if a record has been modified or deleted".
  - Copy to read-only media as soon as possible.
  - Log and monitor all access to logs.
  - Use a separate, restricted database account for writing logs.
  - Detect when logging stops.
  - Use structured JSON and sanitise CR/LF.
  - The cheat sheet does not prescribe hash chains or signatures.
  - Source: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- OWASP Top 10:2025: log access-control failures and alert admins on repeated failures. — [OWASP Top 10:2025 A01](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control)
- WorkOS records the impersonation reason on a `session.created` event, so the audit event carries the justification. — [WorkOS AuthKit impersonation docs](https://workos.com/docs/authkit/impersonation)
- Atlassian's CVE-2023-22515 guidance told customers to check for unexpected `confluence-administrator` group members and new accounts. This shows why admin-group changes must be logged and reviewable. — [Atlassian advisory CVE-2023-22515](https://confluence.atlassian.com/security/cve-2023-22515-broken-access-control-vulnerability-in-confluence-data-center-and-server-1295682276.html)

### Inferences
- Suggested `audit_events` schema: `id, org_id, occurred_at, actor_type (user|platform_staff|system|api_key), actor_id, impersonator_id, action (e.g. member.role.changed), target_type, target_id, before (jsonb), after (jsonb), result (success|denied|error), reason, request_id, ip, user_agent`.
- Grant the app's database role INSERT only on the table, with no UPDATE or DELETE. Optionally add a per-org hash chain (`prev_hash`) or periodic export to object storage with object lock for tamper evidence.
- Expose an org-scoped, read-only audit log to org_admins. B2B customers expect this, and it supports GDPR accountability for candidate data. Log reads and exports of sensitive candidate fields, not only writes.
- Write the audit event in the same transaction as the role or membership change, so there are no unlogged changes.

### Gaps
- I did not fetch a vendor's tenant-facing audit-log schema (for example GitHub's audit log event names). The schema above is an inference.

## 7. Real-world incidents and CVEs from broken authorisation in SaaS

### Takeaway
Well-documented cases include:
- the McHire/Paradox.ai recruitment-platform IDOR (2025), which combined default admin credentials with an unchecked `lead_id` and so maps directly onto recruitment SaaS;
- Atlassian Confluence CVE-2023-22515 (unauthenticated creation of admin accounts, CVSS 10, exploited by a nation-state actor);
- Next.js CVE-2025-29927 (middleware authorisation bypass);
- a 2025 invitation-token CVE (tokens that never expired and survived member removal).

### Cited Findings
**McHire / Paradox.ai (recruitment platform, 2025)**
- In late June 2025, researchers Ian Carroll and Sam Curry found that the restaurant-owner admin login accepted 123456:123456. An IDOR on `lead_id` returned other applicants' data because the API did not check access. Exposed fields reportedly included shift preferences, personality test outcomes and tokens that could impersonate candidates. — [Ian Carroll write-up](https://ian.sh/mcdonalds); [BleepingComputer](https://www.bleepingcomputer.com/news/security/123456-password-exposed-chats-for-64-million-mcdonalds-job-applications/); [SecurityWeek](https://www.securityweek.com/mcdonalds-chatbot-recruitment-platform-leaked-64-million-job-applications/)
- The scope is disputed. Researchers estimated more than 64 million applicant records were exposed. Paradox.ai said the incident affected a single customer, that the researchers accessed five applicants' chats, and that no data was shared online. Paradox disabled the default credentials, fixed the IDOR and launched a bug bounty. — [BleepingComputer](https://www.bleepingcomputer.com/news/security/123456-password-exposed-chats-for-64-million-mcdonalds-job-applications/); [Hackread](https://hackread.com/mcdonalds-mchire-vulnerability-job-seekers-data-leak/)

**Atlassian Confluence CVE-2023-22515**
- An unauthenticated attacker could create unauthorised Confluence administrator accounts. CVSS 10. Atlassian reported active exploitation by "a known nation-state actor", and CISA added it to KEV on 5 October 2023. Only Data Center and Server were affected, not Cloud. — [Atlassian advisory](https://confluence.atlassian.com/security/cve-2023-22515-broken-access-control-vulnerability-in-confluence-data-center-and-server-1295682276.html); [Qualys](https://blog.qualys.com/vulnerabilities-threat-research/2023/11/15/atlassian-confluence-broken-access-control-vulnerability-cve-2023-22515)
- The mechanism was changing server configuration so setup appeared incomplete, then using the `/setup/*` admin-creation endpoint. Atlassian reclassified the issue from privilege escalation to broken access control, and Rapid7 argued it was closer to improper input validation (CWE-20). — [Rapid7](https://www.rapid7.com/blog/post/2023/10/04/etr-cve-2023-22515-zero-day-privilege-escalation-in-confluence-server-and-data-center/); [CERT-EU 2023-073](https://cert.europa.eu/publications/security-advisories/2023-073/)

**Next.js CVE-2025-29927**
- The `x-middleware-subrequest` header let attackers skip middleware, and therefore any auth checks done only in middleware, on self-hosted Next.js. Patched March 2025. — [Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

**CVE-2025-66223 (invitation flaws)**
- Invitation tokens never expired, stayed valid after the invitee was removed, and allowed several invites with different roles to one email. — [Rapid7 CVE-2025-66223](https://www.rapid7.com/db/vulnerabilities/cve-2025-66223/)

**OWASP API1:2023 example scenarios** (generic, not named incidents)
- Cross-shop revenue scraping by shop name, vehicle control via VIN without an ownership check, and GraphQL document deletion without a permission check. — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)

### Inferences
- McHire is the most relevant cautionary tale for a recruitment SaaS. It combined three failures:
  - weak or unmanaged admin access for a tenant-level operator, which is an onboarding and default-credential problem;
  - object-level access with no tenant or ownership check (BOLA);
  - sequential, enumerable IDs.
- Each maps to a control in this document: a central DAL with tenant scoping, permission plus object checks, non-enumerable IDs, MFA and step-up for admins, and audit logging.
- CVE-2025-29927 and CVE-2023-22515 both show that "setup", "internal" or "routing-layer" paths are often outside the main authorisation choke point. Admin bootstrap, setup, invite and webhook endpoints should be explicitly enumerated and tested.

### Gaps
- I found no well-documented, primary-source postmortem from a major B2B SaaS vendor (GitHub, Slack, Stripe) about a tenant-isolation or RBAC authorisation bug within this search budget.
- I did not independently verify the CVE-2025-66223 product name or the details on NVD; they rest on Rapid7's summary.
