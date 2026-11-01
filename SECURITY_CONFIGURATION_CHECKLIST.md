# Security Configuration Checklist

## Identity and sessions

- [ ] Argon2id or approved bcrypt configuration is used for all new passwords.
- [ ] Platform administrators and privileged accounts have MFA enforced.
- [ ] Password reset tokens are single-use, short-lived, hashed at rest, and enumeration-resistant.
- [ ] Access tokens are short-lived; refresh tokens rotate and can be revoked server-side.
- [ ] Logout and account disablement revoke active sessions.
- [ ] Cookie sessions use `HttpOnly`, `Secure`, and appropriate `SameSite` values.
- [ ] Login and recovery endpoints have progressive rate limits and abuse detection.

## Tenant authorization

- [ ] Tenant context is derived from verified authentication and current membership.
- [ ] Every read/write/search/export/aggregation is tenant scoped.
- [ ] Parent-child ownership is checked before mutation.
- [ ] Cross-tenant tests run in CI and fail the build on leakage.
- [ ] Platform support access is short-lived, explicit, and audited.
- [ ] Suspended laundries cannot continue operating with stale access.

## API and browser

- [ ] HTTPS/TLS is enforced at the edge and internal encryption matches the deployment threat model.
- [ ] CORS is an explicit allowlist; no wildcard with credentials.
- [ ] CSP, HSTS, frame, MIME, referrer, and permissions headers are configured.
- [ ] Request body, upload, query, pagination, and timeout limits are enforced.
- [ ] SQL/NoSQL queries are parameterized and schemas reject unexpected fields.
- [ ] Public guest capabilities are signed, expiring, purpose-limited, and minimized.
- [ ] Error responses and logs do not disclose secrets or unnecessary PII.

## Infrastructure and supply chain

- [ ] Internal service ports are private and not published directly.
- [ ] Containers run as non-root with a read-only filesystem where practical.
- [ ] Database credentials are per service and least privilege.
- [ ] Production secrets come from a managed secret store and are rotated.
- [ ] Secret scanning covers current files and Git history.
- [ ] SAST, SCA, container/IaC scanning, DAST, and SBOM generation run before release.
- [ ] Critical and high-risk findings block release unless formally accepted.

## Financial integrity and operations

- [ ] Totals and prices are recalculated on the server.
- [ ] Financial mutations are transactional and idempotent.
- [ ] Finalized records cannot be silently edited/deleted.
- [ ] Audit entries contain actor, tenant, timestamp, action, result, and correlation ID.
- [ ] Backups are encrypted, isolated, retention-controlled, and restore-tested.
- [ ] Incident response, RTO/RPO, tenant restore, and notification procedures are documented.
