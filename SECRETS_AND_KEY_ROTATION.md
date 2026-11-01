# Secrets Management and Key Rotation

## Rules

- Production secrets must be supplied by the deployment secret manager, never committed to source control or bundled into Vite/Flutter artifacts.
- Each service receives only the credentials it needs. Migration, monitoring, backup, and application identities are separate.
- Encryption keys are separate from ciphertext and are identified by a non-secret key version.
- Logs, traces, audit records, client errors, and exports must redact tokens, passwords, API keys, private keys, and database URLs.

## Rotation procedure

1. Create a new secret/key version in the managed secret store.
2. Deploy readers that accept both the current and previous version for a bounded migration window.
3. Rotate issuing credentials first; invalidate old access tokens and service credentials.
4. Re-encrypt field-level data and backups where required, recording key-version metadata only.
5. Verify health, authentication, tenant tests, worker queues, exports, and restores in a dedicated environment.
6. Disable and delete the old version after the retention window.
7. Record owner, reason, scope, timestamps, verification evidence, and rollback decision in the security change log.

## Incident rotation

For suspected exposure: disable the credential immediately, revoke sessions/tokens, rotate dependent service credentials, search logs and Git history, assess tenant impact, preserve evidence, patch the exposure, and notify affected parties according to legal and contractual requirements. Never place replacement secrets in source code or chat.

## Required production variables

`JWT_SECRET`, `MASTER_KEY`, database credentials, service-to-service credentials, `CHAT_API_KEY`, AI provider credentials, Sentry/monitoring credentials, and deployment credentials must be injected from a secret manager. `.env.example` files contain names and synthetic placeholders only.
