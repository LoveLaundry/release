# LoveLaundry Enterprise Security Threat Model

**Status:** Remediation baseline; not a penetration-test certification
**Verification target:** OWASP ASVS Level 2 for tenant and financial APIs, with Level 3 controls for platform administration, authentication, secrets, and auditability.
**Date:** 2026-10-30

## Scope

The platform includes the user, quotation, bill, worker, laundry-management, and Love AI services; web and mobile clients; the bot; MongoDB/PostgreSQL/SQLite stores; file/document exports; background synchronization; Docker/Vercel deployments; and administrative interfaces.

## Trust boundaries

1. Public browsers/mobile clients → edge proxy/WAF → public APIs.
2. Authenticated laundry users → service APIs. The server derives the active laundry from verified claims and membership records; request laundry IDs are not trusted.
3. Platform administrators → separately authorized platform routes with auditable support entry.
4. Internal service/worker calls → private network and scoped service credentials; no public internal ports.
5. API services → tenant-scoped database repositories and encrypted sensitive fields.
6. Backups/exports/logs → restricted operational stores, separate from ordinary application credentials.

## Assets and threats

| Asset | Threats | Required controls |
|---|---|---|
| Credentials, tokens, keys | theft, replay, stuffing, brute force | Argon2id/bcrypt policy, MFA for privileged users, short-lived tokens, revocation, secure storage, rate limits |
| Tenant records | IDOR, cross-tenant queries, manipulated tenant headers | server-derived tenant context, repository guards, ownership checks, cross-tenant tests |
| Financial records | tampering, duplicate writes, race conditions | server-side totals, transactions, idempotency, finalization locks, audit trail |
| PII and chat | exposure in APIs/logs/backups | field encryption, response minimization, redaction, restricted access, retention |
| Uploaded/generated files | path traversal, malware, SSRF, data leakage | allowlists, size/type limits, isolated storage, signed URLs, content scanning |
| Internal services | impersonation, replay, public exposure | private networking, scoped credentials, request signatures/nonces, TLS |
| Availability | abuse, scraping, resource exhaustion | edge limits, body/time limits, rate limiting, bounded queries, worker backpressure |
| Deployment pipeline | secret leakage, vulnerable dependencies, poisoned builds | secret scanning, SCA, SAST, container scan, pinned dependencies, SBOM, protected deploy credentials |

## Current architecture decisions

- Deny-by-default access is enforced at protected route dependencies and tenant-scoped database collection boundaries.
- `laundry_id` is accepted from verified authentication claims/membership snapshots only; client query/body/header values cannot select a tenant.
- Platform administration is separate from laundry administration through `PLATFORM_ADMIN`/support-entry authorization.
- Client builds do not receive shared AI or database credentials.
- Guest tracking/chat currently use possession-based identifiers. These remain a **release blocker** until replaced by signed, expiring, purpose-limited capabilities or an equivalent verified design.

## Residual risks

- Membership snapshots in resource-service JWTs can remain stale until the token is refreshed; fresh revocation checks exist in user-service but must be consistently enforced by every resource service.
- Public tracking/tag codes may expose data to anyone who obtains or guesses a code. Codes must be high entropy, responses minimized, and signed/expiring capabilities should replace raw identifiers.
- MFA, password recovery, refresh-token rotation, and suspicious-session detection require end-to-end product and identity-store work; they are not claimed complete here.
- Backup restore testing and a third-party penetration test have not been evidenced by repository checks.

## Release gate

Do not release while any critical vulnerability, cross-tenant leak, exposed production secret, failed security test, unverified backup restore, or unresolved public capability exposure remains.
