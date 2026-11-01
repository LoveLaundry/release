# Secure Architecture and Network Diagram

```mermaid
flowchart LR
  Client[Web / Mobile Client] --> Edge[HTTPS Edge / WAF / Rate Limits]
  Edge --> Public[Public API Gateway]
  Public --> Auth[User Service\nJWT + membership + MFA]
  Public --> Quotation[Quotation Service\nTenant-scoped repositories]
  Public --> Bills[Bill Service\nFinancial transactions]
  Public --> Workers[Worker Service\nAssigned tenant jobs]
  Public --> AI[Love AI\nAuthenticated analytics]
  Public --> Guest[Guest capability gateway\nSigned expiring token]
  Quotation --> Main[(Main DB\nTenant-scoped collections)]
  Bills --> Main
  Workers --> Main
  AI --> Main
  Auth --> Identity[(Identity DB\nusers / memberships / sessions)]
  Auth --> Audit[(Append-only audit store)]
  Workers --> Queue[(Private queue)]
  Queue --> Workers
  Files[(Encrypted file store)] --> Public
  Backup[(Encrypted isolated backups)] -. restore test .-> Main
  Ops[Restricted operations network] --> Backup
  Ops --> Audit
  Secrets[Managed secret store] --> Auth
  Secrets --> Quotation
  Secrets --> Bills
  Secrets --> Workers
  Secrets --> AI
```

## Network rules

- Only the edge is internet-facing. Database, queue, secrets, backup, and management networks are private.
- Each service has a separate database identity and secret scope.
- Internal service calls use TLS/private networking and scoped credentials; no database master key is sent to a client or general bot.
- Guest capability endpoints are isolated from staff routes and return minimized fields.
- Audit and backup stores are not writable by ordinary application identities.

The diagram is an architecture target. Deployment firewall and cloud/IAM evidence must be attached before release.
