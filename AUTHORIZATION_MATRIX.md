# Authorization Matrix

**Rule:** authentication and authorization are server-side. A client-supplied laundry identifier is never an authorization grant.

| Capability | Anonymous | Laundry staff | Laundry manager/admin | Platform admin | Internal worker/service |
|---|---:|---:|---:|---:|---:|
| Public shop catalog | Read published, minimized fields | Read | Read | Read | Scoped service only |
| Guest tracking/chat | Read/write only with valid guest capability | No anonymous bypass | No anonymous bypass | Audited support only | No raw public capability |
| Own laundry quotations | No | Read/create/update per role | Full own-tenant workflow | Audited support-entry, selected tenant | Job-scoped only |
| Other laundry quotations | No | No | No | Only audited support-entry | No |
| Bills/payments | No | Read/operate permitted workflow | Approve/finalize own tenant | Audited support-entry | Idempotent job scope |
| Worker/delivery records | No | Operate assigned workflow | Manage own tenant | Audited support-entry | Job tenant context required |
| User membership changes | No | No | Own-laundry admin scope | Platform admin only | No |
| Platform users/laundries | No | No | No | Platform admin only | No |
| Audit logs | No | No | Own-tenant permitted events, read-restricted | Platform audit access | Append-only event writer |
| Backups/restores | No | No | No | Separate operations role with approval | Backup identity only |
| Security configuration/secrets | No | No | No | Separate platform operations role | Secret-specific identity |

## Enforcement requirements

- Every protected route uses verified authentication and server-side role checks.
- Every resource query, mutation, export, aggregation, and parent-child reference is tenant scoped.
- Foreign and unknown object identifiers return indistinguishable not-found responses where appropriate.
- Platform administration cannot be reached by ordinary laundry administrators.
- Suspended/archived memberships deny operational access.
- Background jobs carry a validated tenant context and cannot widen it.
- Sensitive actions require reauthentication/MFA when the identity system supports those flows.
