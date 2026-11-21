# Cross-Tenant Data Leak Vectors in Multi-Tenant SaaS: Catalogue, Prevention, Testing

Context for the report writer: the target system is a Next.js + Node.js API with a single RPC endpoint (`/api/rpc/<service>/<method>`), an in-process per-organisation record cache, S3-compatible document storage, and background CV-processing jobs. The Inferences sections map the findings onto that architecture. Research done 2026-11-21.

## 1. IDOR / BOLA (OWASP API1:2023) and Broken Function-Level Authorisation (API5:2023) in JSON/RPC APIs

### Takeaway
BOLA happens when the server acts on a client-supplied object ID without checking that the caller may act on that object. OWASP rates it easy to exploit and widespread. The main defence is an authorisation check on every lookup, best done by scoping the query to the caller's tenant. Random IDs such as GUIDs are only defence in depth. BFLA is the function-level version: admin or privileged operations that anyone authenticated can reach. The defence is deny-by-default with an explicit grant for every function.

### Cited Findings
- **BOLA definition:** the server does not verify that the user may act on the specific object whose ID the client supplies. Because the endpoint itself is legitimately reachable, the attacker only has to swap the ID. Impacts include disclosure, modification, destruction and sometimes account takeover. OWASP rates exploitability "easy" and prevalence "widespread" — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)
- **OWASP scenarios:**
  - A shop revenue endpoint `/shops/{shopName}/revenue_data.json`. Shop names could be listed through another endpoint, so a script pulled sales data for thousands of stores.
  - A connected-car API that took a VIN without checking ownership, letting attackers control other people's vehicles.
  - A GraphQL `deleteDocument` mutation that took a document ID with no permission check.

  The last one is the closest analogue to RPC-style `service.method({id})` calls — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)
- **OWASP API1 prevention:**
  - An authorisation mechanism based on user policies and hierarchy.
  - A check "in every function that uses an input from the client to access a record in the database."
  - Prefer random, unpredictable IDs (GUIDs).
  - Write authorisation tests and do not deploy changes that break them.

  OWASP also warns that comparing the session user ID with the requested ID "isn't a sufficient solution" — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)
- **IDOR Cheat Sheet, scoping lookups:** look records up through the current user's own data rather than the global table. The Rails example is `current_user.projects.find(id)` instead of `Project.find(id)`. A post-fetch ownership check is the alternative. Return the same response (for example 404) for "not found" and "not allowed" when an object's existence is itself sensitive — [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- **IDOR Cheat Sheet, random identifiers:** GUIDs, UUIDs and random strings are defence in depth only. "Access control is crucial even with these identifiers." The sheet advises against encrypting identifiers, and says to take the current user from the session rather than from request parameters — [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- **BFLA patterns:**
  - Regular users calling admin endpoints. Admin endpoints often sit beside regular ones (for example under `/api/users`), so the path does not show who should have access.
  - Switching the HTTP method (`GET` to `DELETE`).
  - Guessing endpoints such as `/api/admin/v1/users/all`.
  - A user with a limited invite POSTing to an admin-only invite endpoint to mint an admin invite.

  Source: [OWASP API5:2023](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization)
- **BFLA prevention:**
  - A consistent, easy-to-analyse authorisation module that every business function calls.
  - Deny by default, requiring "explicit grants to specific roles for access to every function."
  - Review every endpoint against business logic and the group hierarchy.
  - Admin controllers inherit from a base controller that enforces role checks.
  - Admin functions inside regular controllers check the role too.

  Source: [OWASP API5:2023](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization)
- **Framework-layer auth can be bypassed (Next.js CVE-2025-29927):**
  - Next.js used the internal header `x-middleware-subrequest` to skip Middleware, and attackers could set it to bypass Middleware entirely. Apps that checked auth cookies in Middleware could be bypassed.
  - Affected: self-hosted `next start` and `output: 'standalone'` apps. Not affected: Vercel, Netlify and Cloudflare Workers.
  - Fixed in 14.2.25 and 15.2.3 (17–18 Mar 2025), with backports to 13.5.9 and 12.3.5.
  - Vercel's postmortem says Middleware is not recommended as the only protection method, and that stripping the header is a workaround where you cannot upgrade.

  Source: [Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

### Inferences
- In a single `/api/rpc/<service>/<method>` dispatcher, BFLA and BOLA collapse into two checks that must happen in one central place before any handler runs:
  - Is this `(service, method)` pair on an explicit allowlist with a required role? This is function level.
  - Inside the handler, is every repository call scoped by `orgId` taken from the session, never from the request body? This is object level.
- Every RPC method should declare its required permission, and the dispatcher should fail closed when a declaration is missing.
- A robust pattern is a data-access layer whose functions take a mandatory `ctx` (`orgId`, `userId`, `role`) and always include `WHERE org_id = ctx.orgId`. Raw ORM access from handlers should be lint-banned. Postgres row-level security keyed on a per-transaction `app.current_org` setting adds a database-level backstop, so a missed filter returns nothing instead of another tenant's rows.
- Writes are BOLA too. Updates, deletes, and creates that reference a foreign key (for example "attach candidate X to job Y") must verify every referenced ID belongs to the caller's org, not just the primary record.
- Because of CVE-2025-29927, Next.js Middleware should be treated only as UX routing. Authorisation must be enforced again in the RPC handler and data layer.

### Gaps
- I did not fetch OWASP's mass-assignment guidance (API3:2023, BOPLA). Mass assignment of `orgId` or `role` fields in RPC payloads is a closely related vector that the report should mention, but it is not cited here.

## 2. Leaks outside the database: caches, search, object storage, jobs, webhooks, exports, logs, analytics, email tokens, CDN

### Takeaway
Some of the best-documented cross-tenant and cross-user leaks happened in caching layers, not authorisation code:
- **ChatGPT, March 2023:** a Redis client connection-reuse bug served one user's cached data to another.
- **Steam, December 2015:** a CDN cached authenticated pages.

Presigned object-storage URLs are bearer tokens that last up to 7 days. Every secondary store (cache, index, bucket, queue payload, log) needs the tenant ID in its key or partition, and the tenant should be re-verified when data is read back.

### Cited Findings
- **ChatGPT, 20 March 2023 (shared cache / connection pool):**
  - A bug in the redis-py asyncio client with Redis Cluster left a pooled connection holding stale data when a request was cancelled after being queued but before its response was read.
  - The next request on that connection could get another user's cached data.
  - Exposed: other users' chat-history titles, possibly the first message of new conversations, and for about 1.2% of Plus subscribers active in a nine-hour window, name, email, billing address, card type, last four digits and expiry.
  - Fixes included "added checks to confirm cached data matches the requesting user", improved logging, and hardening the Redis cluster.

  Source: [OpenAI incident post](https://openai.com/index/march-20-chatgpt-outage/)
- **Steam, 25 December 2015 (CDN caching authenticated responses):**
  - A caching configuration that a web-caching partner deployed during a DoS attack cached authenticated store pages.
  - Store page requests for about 34,000 users were served to other users between 11:50 and 13:20 PST. The pages contained billing addresses, partial phone numbers and purchase history.
  - Valve said no passwords or full payment details were exposed.

  Sources: [Valve/Steam statement](https://store.steampowered.com/news/19852); secondary coverage: [Engadget](https://www.engadget.com/2015/12/30/steams-christmas-privacy-issues-affected-34-000-users/), [SteamDB analysis](https://steamdb.info/blog/recent-caching-issues-on-steam)
- **Presigned URLs, bearer and expiry behaviour:**
  - They are bearer tokens ("grant access to those who possess them") and can be used repeatedly until they expire.
  - Maximum lifetime is 7 days with SigV4 and IAM user keys, and 1 minute to 12 hours from the console. A URL signed with temporary credentials (an STS or role session) expires when those credentials expire.
  - S3 checks expiry only when the request starts, so a download already in progress continues past expiry.
  - A presigned PUT overwrites any existing object at the same key.

  Source: [AWS S3 presigned URL docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- **Presigned URLs, controls:**
  - A bucket-policy `s3:signatureAge` condition that denies old signatures (example: 10 minutes).
  - Network restrictions with `aws:SourceIp` and `aws:SourceVpc`/`aws:SourceVpce`.
  - Sign with a unique STS role session per issuance and record the application user, bucket, key, operation and expiry, because CloudTrail logs the signer, not who later used the URL.
  - Server access logs can contain credential material in the Request-URI and should be restricted and redacted.

  Source: [AWS S3 presigned URL docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- **Misconfigured "public" data endpoints in multi-tenant platforms:**
  - Power Apps portals exposed about 38M records from 47 entities through anonymous OData feeds, because table permissions were off by default on lists (see section 4).
  - Salesforce Experience Cloud guest-user misconfigurations exposed SSNs and bank details (see section 4).

  Sources: [UpGuard](https://www.upguard.com/breaches/power-apps), [KrebsOnSecurity](https://krebsonsecurity.com/2023/04/many-public-salesforce-sites-are-leaking-private-data/)
- **Secondary code paths that skip the tenant check:** Asana's MCP server, launched 1 May 2025, had a bug that "could have potentially exposed certain information from your Asana domain to other Asana MCP users." Asana took it offline from 5 to 17 June 2025 and reset all connections — [The Register](https://www.theregister.com/2025/06/18/asana_mcp_server_bug/). Two further details come from secondary sources only and are not confirmed by Asana:
  - A root cause in which the new integration resolved entities by ID without re-checking the tenant binding — [Safeguard analysis](https://www.safeguard.sh/resources/blog/asana-mcp-cross-tenant-data-leak-2025)
  - An estimate of about 1,000 customers affected — [UpGuard blog](https://upguard.com/blog/asana-discloses-data-exposure-bug-in-mcp-server)

### Inferences
**In-process per-org record cache**
- Key every entry as `${orgId}:${entity}:${id}`, never by record ID alone. On read, assert `entry.orgId === ctx.orgId`, which mirrors OpenAI's post-incident fix.
- Use `Map` or `Object.create(null)` for cache containers (see section 3).
- Invalidate on membership or role changes.
- Be aware that a module-level cache in Next.js or serverless runtimes is shared across all concurrent requests in that process. Any request-scoped state held in module scope (for example a "current org" variable) can bleed between requests under concurrency. Use AsyncLocalStorage or pass `ctx` explicitly.

**S3 document storage (CVs)**
- Prefix keys with the tenant (`org/<orgId>/...`), but never treat the prefix alone as authorisation.
- Generate a presigned GET only after an RPC-level authorisation check on the document record.
- Use short expiries (minutes) and the `s3:signatureAge` deny policy.
- Block public access at the bucket and account level.
- Generate server-side random object keys for presigned PUTs so tenants cannot overwrite each other's objects (S3 replaces the existing object at the same key).
- Set `Content-Disposition: attachment` and `Cache-Control: private, no-store` on responses.

**Background CV-processing jobs**
- Put `orgId` in every job payload. The worker should re-load the record with an org-scoped query rather than trusting IDs in the payload.
- Write outputs (parsed CV fields, embeddings, extracted text) to org-scoped locations.
- Make sure retry and dead-letter handling never re-associates output with the wrong record.
- If embeddings or a search index are used, every index document needs an `orgId` field, and every query must apply a mandatory tenant filter.

**Webhooks, exports, email links**
- Exports must reuse the same org-scoped data layer rather than bespoke "export all" queries (compare OWASP's BFLA "export all users" example).
- Email tokens and links (invites, password resets, shared links) should be single-purpose, short-lived, and bound to both the org and the user.
- Webhook delivery should look up the subscriber's URL by the event's orgId.

**Logs, errors, analytics**
- Error messages should not echo records or confirm that IDs exist in other tenants (OWASP's uniform 404 advice).
- Logs and analytics events that contain PII should be tagged with orgId so access and deletion can be scoped. Do not log presigned URLs.

**CDN and Next.js caching**
- Authenticated RPC responses must send `Cache-Control: private, no-store`.
- Never let a fetch or data cache, or a CDN, cache responses whose content depends on cookies or session (the Steam lesson).

### Gaps
- I did not fetch the OWASP Logging and File Upload cheat sheets, so there are no direct citations for log-content guidance or upload handling.
- I found no primary-source incident reports for cross-tenant leaks via search indexes, webhooks or job queues in this pass. The recommendations for those are design inferences.
- I did not fetch the web cache deception research (Omer Gil, 2017) or the Next.js cache-poisoning advisories (for example CVE-2024-46982).

## 3. Prototype pollution and dynamic dispatch in Node.js RPC handlers

### Takeaway
A dispatcher such as `services[service][method](args)` with names taken from the URL can reach inherited `Object.prototype` members (`constructor`, `toString`, `hasOwnProperty`, `__defineSetter__`, ...). If any authorisation map is a plain object, a polluted prototype can make `permissions[method]` or `user.isAdmin` truthy for every request in the process. The fix is an explicit `Map` allowlist of callable methods with own-property checks, plus prototype-pollution hardening.

### Cited Findings
- **CodeQL `js/unvalidated-dynamic-method-call`:**
  - The query flags calling a method looked up by a user-controlled name.
  - A non-function lookup throws a `TypeError`, which can cause denial of service if unhandled. Inherited `Object.prototype` methods (`valueOf`, `hasOwnProperty`, `__defineSetter__`) are a subtler risk.
  - Recommended fixes: store handlers in a `Map` and check `has()` and `typeof === 'function'`; or, with a plain object, check own properties (`hasOwnProperty`) and function type; or avoid dynamic lookup and use an allowlist of method names.

  Source: [CodeQL query help](https://codeql.github.com/codeql-query-help/javascript/js-unvalidated-dynamic-method-call/)
- **OWASP Prototype Pollution Prevention Cheat Sheet:**
  - Use `Map` and `Set` instead of object literals for keyed data and allowlists.
  - Use `Object.create(null)` (or `{__proto__: null}` as a last resort).
  - `Object.freeze` built-in prototypes. It is shallow and may break libraries, and `Object.seal` is weaker.
  - Node's `--disable-proto=delete` is defence in depth only, because `constructor.prototype` pollution still works.

  Source: [OWASP Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)
- **Prototype pollution as an access-control bypass:** Object.prototype is shared across the Node process, so polluting it can make checks such as `user.isAdmin` pass for every user. MDN describes this pattern — [MDN: Prototype pollution](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution)
- **Recent example, CVE-2026-41690 (i18next-http-middleware, fixed in 3.9.3):** unauthenticated HTTP clients could pollute Object.prototype, with impacts including authorisation bypass. This is a secondary summary that I have not checked against the official advisory — [SentinelOne vuln DB](https://www.sentinelone.com/vulnerability-database/cve-2026-41690/)
- **Denylist filters are fragile:** the lodash CVE-2019-10744 fix was bypassed through `constructor.prototype`. Filters that block only `__proto__` are not enough. This comes from a secondary search summary; the primary lodash advisory was not fetched — [MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution) and the search results above.

### Inferences
For `/api/rpc/<service>/<method>`:
- Build a frozen registry: `const registry = new Map([['candidates.get', {handler, permission:'candidate:read'}], ...])`. Look up the joined `service.method` string. Reject anything missing with 404, and reject any name that is not `/^[a-z][A-Za-z0-9]*$/`.
- Never use `services[service][method]` on class instances or modules. Class instances expose `constructor` and every inherited prototype method, and modules may export helpers that were never meant to be callable. Either could reach an unscoped internal helper such as `_findById` and bypass tenant scoping.
- Permission maps, role maps and per-org caches should be `Map` or `Object.create(null)`, and checks should use `Object.hasOwn` rather than truthiness.
- Validate RPC request bodies with a strict schema (for example zod `.strict()`) so `__proto__`, `constructor` and `prototype` keys are rejected before any merge or spread. Avoid deep-merge utilities on request input.
- Run with `--disable-proto=throw` where compatible.
- Add the CodeQL `js/unvalidated-dynamic-method-call` and prototype-pollution queries to CI.

### Gaps
- I found no documented incident where RPC dynamic dispatch reaching `constructor` caused a cross-tenant leak in the wild. The risk is drawn from the CodeQL and OWASP guidance plus general prototype-pollution research.
- I did not fetch the Silent Spring (USENIX Security 2023) and GHunter gadget papers, which were mentioned in search results.

## 4. Documented real-world cross-tenant incidents and lessons

### Takeaway
Incidents fall into three classes:
1. **Provider-side isolation bugs:** ChaosDB, and the Asana MCP server.
2. **Configuration defaults that make tenant data public:** Power Apps portals, Salesforce Experience Cloud.
3. **Shared-infrastructure caching errors:** ChatGPT/Redis, Steam/CDN.

The recurring lessons:
- New features and new code paths (notebooks, MCP connectors) are where isolation breaks.
- Insecure defaults matter more than documentation warnings.
- Long-lived secrets turn a brief bug into lasting access.
- Customers need logs to scope exposure.

### Cited Findings
- **ChatGPT / Redis, March 2023, and Steam, December 2015:** both are caching failures in shared infrastructure, detailed in section 2 — [OpenAI](https://openai.com/index/march-20-chatgpt-outage/), [Steam](https://store.steampowered.com/news/19852)
- **ChaosDB (Azure Cosmos DB, Wiz, disclosed 26 August 2021):**
  - A Jupyter Notebook feature, added in 2019 and enabled by default from February 2021, had misconfigurations that allowed escalation into other customers' notebooks and retrieval of their Cosmos DB primary keys.
  - The primary keys were long-lived and gave full read, write and delete access from the internet.
  - Wiz gained "complete unrestricted access" to the databases of several thousand customers, including Fortune 500 companies.
  - Microsoft disabled the feature within 48 hours and told more than 30% of Cosmos DB customers to rotate keys.
  - Lessons: default-on features widen exposure to customers who never used them, and long-lived keys keep access alive after the bug is fixed.

  Source: [Wiz Research](https://www.wiz.io/blog/chaosdb-how-we-hacked-thousands-of-azure-customers-databases)
- **Microsoft Power Apps portals (UpGuard, published 22 August 2021):**
  - OData feeds at `_odata` exposed list data anonymously, because table permissions were disabled by default on lists. About 38M records were exposed across 47 entities.
  - Examples: American Airlines (about 869k), J.B. Hunt (905,228 records, 253,288 with SSN-format values), State of Indiana (1,087,240 records), Maryland Department of Health (about 388.5k), NYC MTA, and Microsoft's own Global Payroll list (332k).
  - MSRC first closed the report as "by design" (29 June 2021). Microsoft later released Portal Checker and made table permissions on by default for new portals.
  - UpGuard's lessons: vendors should fix systemic misconfiguration risk in the product, and SaaS providers should give customers the logs they need to investigate.

  Source: [UpGuard](https://www.upguard.com/breaches/power-apps)
- **Salesforce Community / Experience Cloud sites (KrebsOnSecurity, 27 April 2023):**
  - Many public sites, including banks and healthcare providers, leaked private data through guest-user access settings. A Vermont pandemic-assistance site exposed names, SSNs, email addresses and bank account information.
  - Researcher Charan Akiri found hundreds of misconfigured organisations. Aaron Costello had flagged the issue in August 2021.
  - Salesforce said misconfiguration exposures are "not the result of a vulnerability inherent to Salesforce" and pointed to its Guest User Access Report Package.

  Source: [KrebsOnSecurity](https://krebsonsecurity.com/2023/04/many-public-salesforce-sites-are-leaking-private-data/); related: [Varonis](https://www.varonis.com/blog/salesforce-misconfiguration-causes-sensitive-data-leaks)
- **Asana MCP server (May–June 2025):** a new AI integration path exposed data across organisations, and all connections were reset. See section 2 for details and the confidence of each claim — [The Register](https://www.theregister.com/2025/06/18/asana_mcp_server_bug/)

### Inferences
These lessons map onto the target system as follows:
- **New code paths:** new entry points (AI agents or MCP tools, export endpoints, admin consoles, job workers) are the riskiest places for isolation. Each must go through the same org-scoped data layer rather than a parallel implementation (Asana).
- **Defaults:** defaults should be closed. New RPC methods and new storage buckets should be private and deny-by-default (Power Apps, Salesforce).
- **Shared infrastructure:** caches and connection pools need a tenant assertion on read (ChatGPT/Redis), and authenticated responses must be uncacheable at the edge (Steam).
- **Credentials:** prefer short-lived credentials (presigned URLs, tokens) so a leak expires quickly (ChaosDB).
- **Incident scoping:** keep per-tenant access logs so an incident can be scoped and affected customers notified (UpGuard, Asana).

### Gaps
- I did not fetch other well-known provider isolation bugs in this pass:
  - Wiz ExtraReplica (Azure PostgreSQL Flexible Server, 2022)
  - Orca SynLapse (Azure Synapse, 2022)
  - Wiz "BingBang" (Azure AD multi-tenant app misconfiguration, 2023)
  - Microsoft Storm-0558 key compromise (2023)
- These would strengthen the catalogue but are not cited here.
- I could not retrieve the AWS SaaS Tenant Isolation Strategies whitepaper text. Its well-known section "authentication and authorization are not isolation" is unverified in this pass. The SaaS Lens page fetched only states that tenant isolation is foundational, and that crossing the boundary "would represent a significant and potentially unrecoverable event for a SaaS business" — [AWS SaaS Lens: Tenant Isolation](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html)

## 5. Testing: automated cross-tenant tests, authorisation matrices, tooling, CI

### Takeaway
The standard method is multi-account differential testing:
- Create at least two tenants, each with users at several roles.
- Have each user try every read and write on the other tenant's object IDs.
- Assert a uniform denial.

OWASP prescribes this both for testing and as a CI gate ("do not deploy changes that cause the tests to fail"). Burp Autorize automates the same idea for manual or exploratory testing by replaying every request with a lower-privileged or other-tenant session.

### Cited Findings
- **OWASP testing method:** create multiple accounts with different permissions and objects owned by each. Authenticate as one and try to read, create, update, delete, export and perform admin actions on the other's objects. Confirm access is denied whether IDs are predictable or not — [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- **OWASP CI gate:** "Write tests to evaluate the vulnerability of the authorization mechanism. Do not deploy changes that make the tests fail" — [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization)
- **Endpoint review:** OWASP API5 recommends reviewing every endpoint against business logic and the group hierarchy, which in practice means a role-by-function matrix — [OWASP API5:2023](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization)
- **Burp Autorize:**
  - You browse as a high-privileged user, and Autorize replays each request with a low-privileged user's Cookie or Authorization header, and optionally with no credentials.
  - It compares responses and uses configurable "enforcement detectors" (body regex, headers, content length) to label each request Bypassed!, Enforced! or Is enforced???.
  - Scope filters skip static assets.

  Source: [PortSwigger/Autorize GitHub](https://github.com/PortSwigger/autorize)
- **Static analysis:** CodeQL ships a query for unvalidated dynamic method calls that can run in CI — [CodeQL](https://codeql.github.com/codeql-query-help/javascript/js-unvalidated-dynamic-method-call/)

### Inferences
Suggested CI suite for this architecture:
1. **Registry-driven matrix test:**
   - Enumerate every entry in the RPC method registry.
   - For each entry, run calls as {Org A owner, Org A member, Org A viewer, Org B owner, unauthenticated}, against fixtures owned by Org A.
   - Assert the expected allow or deny for each role. Assert that every cross-org call returns the same 404 or 403 shape and leaks no data.
   - Fail the build when a new method has no matrix entry, which is a completeness check.
2. **Write-path tests:** update, delete and create calls that reference Org A IDs, made from Org B. Afterwards, assert the Org A data is unchanged, not just that the response was 403.
3. **Dispatch fuzzing:** call `/api/rpc/<service>/constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`, `_privateHelper` and unknown names. Expect 404 and no 500 or stack trace. Send bodies containing `__proto__` and `constructor.prototype` payloads and assert that `({}).isAdmin` stays undefined afterwards.
4. **Cache isolation test:**
   - Warm the per-org cache as Org A, then request the same record ID as Org B and expect a miss or denial.
   - Run concurrent interleaved requests from two orgs and assert that every response's `orgId` matches the caller. This catches leaks of request-scoped state held in module scope.
5. **Storage tests:**
   - Org B cannot obtain a presigned URL for an Org A document.
   - Generated URLs have an expiry at or below policy.
   - The bucket rejects anonymous GETs.
   - Uploads cannot target another org's key prefix.
6. **Job tests:** enqueue a CV job whose payload has a mismatched orgId and recordId. The worker should refuse, and its outputs should land only under the record's own org.
7. **Header and caching tests:** authenticated RPC responses carry `Cache-Control: private, no-store`. Requests carrying `x-middleware-subrequest` are stripped or ineffective, and the installed Next.js version is at least the patched release.
8. **Periodic manual pass:** run Burp Autorize with Org B's session cookie while browsing as Org A, before major releases.

### Gaps
- I did not fetch the OWASP Web Security Testing Guide authorisation sections (WSTG-ATHZ-02 bypassing the authorisation schema, WSTG-ATHZ-04 IDOR), so their exact test steps are not cited.
- I found no primary source with an industry benchmark for how widely CI cross-tenant matrix testing is adopted.
