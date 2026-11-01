# Security Remediation Register

| ID | Risk | Status | Owner | Release impact |
|---|---|---|---|---|
| SEC-001 | Cross-tenant access in resource APIs | Partially remediated in quotation/laundry-management paths; all services still require verification | Backend owners | Block release until all relevant APIs pass cross-tenant tests |
| SEC-002 | Raw public tracking/tag identifiers act as bearer capabilities | Open | Product + backend | Block release until signed, expiring, purpose-limited capabilities are verified |
| SEC-003 | Privileged MFA and full recovery lifecycle | Open/partially implemented | Identity owner | Block privileged production release |
| SEC-004 | Refresh-token rotation and global revocation | Open/partially implemented | Identity owner | High |
| SEC-005 | Restore-test evidence | Open | Operations owner | Block release |
| SEC-006 | CI SAST/SCA/secret/container/SBOM/DAST gates | Open; test dependency manifests exist | DevSecOps owner | Block release until pipeline is active |
| SEC-007 | Independent penetration test | Open | Security owner | Block high-risk release |
| SEC-008 | Per-service database credentials/private network proof | Partially documented; deployment evidence required | Operations owner | Block release if ports are public |
| SEC-009 | Financial idempotency/finalization verification across every mutation | Partially implemented; requires endpoint inventory and concurrency tests | Finance/backend owners | Block financial release |
| SEC-010 | Centralized alert thresholds and protected retention | Partially documented; runtime integration required | Operations owner | High |

No risk is accepted silently. Each open item requires an owner, target date, evidence, and explicit release decision.
