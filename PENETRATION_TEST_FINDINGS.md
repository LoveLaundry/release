# Penetration-Test Findings Report

**Assessment status:** Not executed. This document is a test plan and findings register, not a claim of an independent penetration test.

## Authorized scope

Use only a dedicated staging environment populated with synthetic tenants, users, files, quotations, bills, payments, workers, and guest capabilities. Do not test production or third-party systems without written authorization.

## Required test cases

1. Login, reset, MFA, session expiry, refresh rotation, logout, reuse detection, and account disablement.
2. Staff/admin/platform-admin role separation and audited support entry.
3. Cross-tenant read, create, update, delete, export, aggregation, search, parent-child reference, and background-job tests.
4. Guest capability entropy, expiry, purpose binding, replay, enumeration, response minimization, and chat authorization.
5. Injection, XSS, CSRF, SSRF, path traversal, upload limits/content type, unsafe deserialization, mass assignment, and error disclosure.
6. Rate-limit bypass, pagination/resource exhaustion, duplicate financial mutation, idempotency, and concurrent payment requests.
7. Container, network, database permissions, public ports, debugging, headers, TLS, secrets, backup access, and restore isolation.

## Current repository evidence

Automated tenant/security tests exist in multiple services, but a full runtime assessment could not be executed from this workspace because the Python test dependency environment is not installed. The independent assessment remains open and blocks a claim of production security.

## Findings to validate

- **Critical:** any cross-tenant object access or exposed production secret.
- **High:** raw guest capability accepted without signed expiry/purpose binding; missing MFA for privileged account; public internal database/service port; failed restore isolation.
- **Medium:** missing security headers, weak rate-limit configuration, verbose error/log data, incomplete audit context.

Every confirmed finding must receive an owner, severity, evidence, remediation, retest result, and deadline in `SECURITY_REMEDIATION_REGISTER.md`.
