# Incident Response Plan

## Detection

Alert on repeated failed logins, privilege changes, cross-tenant authorization failures, unusual sensitive-record access, public exposure, dependency/infrastructure vulnerabilities, backup failures, and suspicious administrative activity. Every request should carry a safe correlation ID; logs must redact secrets and unnecessary PII.

## Response phases

1. **Triage:** assign an incident owner, preserve logs/evidence, classify severity, identify affected services/tenants, and avoid destructive investigation.
2. **Containment:** revoke sessions and credentials, disable affected routes/jobs, isolate the service or tenant, block malicious traffic, and protect backups.
3. **Investigation:** determine entry point, timeline, accessed/changed records, tenant scope, persistence, and whether data was exfiltrated. Preserve hashes and chain of custody.
4. **Eradication:** patch code/configuration, rotate keys, remove persistence, rebuild from trusted sources, and validate dependencies and deployment images.
5. **Recovery:** restore only through the approved DR process, verify tenant ownership and financial integrity, monitor closely, and re-enable gradually.
6. **Notification:** assess contractual, regulatory, customer, insurer, and law-enforcement notification obligations with counsel.
7. **Learning:** conduct a blameless review, update controls/tests/runbooks, assign owners and deadlines, and track residual risk.

## Severity

- **Critical:** confirmed cross-tenant exposure, production secret compromise, authentication bypass, destructive financial tampering, or active widespread compromise. Stop release and initiate immediate containment.
- **High:** exploitable authorization, public sensitive endpoint, privileged compromise, or critical unpatched dependency.
- **Medium/Low:** bounded weakness without evidence of exploitation; remediate by the assigned deadline.

## Emergency contacts and evidence locations

Populate service owner, security owner, hosting provider, backup provider, legal contact, and notification contacts in the deployment runbook. Do not place credentials or private contact data in this public repository document.
