# LoveLaundry System Manual — Second Edition

**Laundry, platform administration, shop, hotel and linen-room operations**  
**Document ID:** LL-SM-002  
**Issue:** Second Edition — November 2026  
**Owner:** Rasindu Dulshan Siriwardhana, Developer and Systems Architect  
**Classification:** Internal — Proprietary

> This edition consolidates the existing operational manual, the first-class Hotel and Shop entity architecture, and the platform-admin UI introduced in the current release. It distinguishes implemented behavior from migration work that is still planned.

---

## How to use this book

- **Operators** should begin with the application chapter for their role and then use the example flows.
- **Administrators** should read the platform, identity, security and recovery chapters before creating users or entities.
- **Engineers and support staff** should use the architecture, API, test-evidence and troubleshooting chapters as the reference during changes and incidents.
- **Auditors and reviewers** should pay particular attention to scope boundaries, evidence labels and the limitations section. A target or recommendation is not the same as a verified runtime fact.

### Evidence labels

- **Implemented** — present in the current code/UI or documented by an executed test/build result.
- **Policy** — an operating rule required for safe use.
- **Planned** — a future enhancement or migration step; do not describe it as complete.
- **Example** — illustrative data and flow, not production data.

---

# Part I — Foundation

## 1. Purpose and scope

LoveLaundry is a multi-tenant operations platform for laundry businesses serving hotels, shops and walk-in customers. It connects the records needed to receive goods, process linen, deliver finished work, issue bills and reconcile payments while keeping each laundry's data isolated.

This edition covers:

- platform administration and entity registries;
- user identities, memberships and role-based access;
- laundry operations, gate passes, deliveries, billing and day close;
- Shop Counter, Hotel Desk, Linen Room and the main Laundry application;
- service boundaries, APIs, security controls, backups and incident handling;
- example flows for onboarding, daily operations, exceptions and recovery;
- current verification evidence and known gaps.

It does not claim that every future entity-ID migration, browser end-to-end flow or performance target has been completed. Those items are labelled where they appear.

## 2. The operating model

LoveLaundry has four working surfaces:

| Surface | Main users | Primary job |
|---|---|---|
| Platform administration | Platform operators | Create and govern laundries, users, hotels and shops |
| Laundry application | Owners, managers, supervisors and office staff | Run the full laundry operation |
| Shop Counter | Counter staff and shop supervisors | Process walk-in orders, payments and day close |
| Hotel Desk | Hotel front office and housekeeping | Read the hotel's own passes, deliveries and invoices |
| Linen Room | Linen supervisors and housekeepers | Scan, process and reconcile tagged linen |

The system is deliberately not one giant workflow. A hotel should not see internal costs. A counter operator should not need a monthly matrix. A platform administrator should not accidentally operate a tenant because they opened a registry screen.

## 3. Vocabulary

- **Laundry / tenant:** the business that provides the service and owns its operational records.
- **Hotel entity:** a first-class platform entity associated with one active laundry. Existing operational records may still retain `client_name` during the compatibility period.
- **Shop entity:** a first-class platform entity associated with one active laundry.
- **Membership:** a user's link to a laundry, hotel or shop, including role and status.
- **Gate pass:** the receipt and work order for goods received.
- **Delivery:** the record of goods returned, possibly in partial deliveries.
- **Bill:** an issued financial document derived from delivered work.
- **Linen tag:** the physical identifier whose scan history supports lifecycle and discrepancy handling.
- **Day close:** the reconciliation that freezes a business date's totals.
- **Support entry:** a controlled, temporary platform-admin session into an entity for investigation.

---

# Part II — Architecture and Security

## 4. Service and data architecture

The platform uses bounded FastAPI services with React front ends. `user-service` owns identity, authentication, laundries, memberships and platform-managed Hotel and Shop registries. `bill_service` owns operational documents such as gate passes, deliveries, bills, shop bills, linen records and returns. `laundry-management` owns accounting and management records. `quotation-service` owns price proposals. `worker-service` owns worker and attendance records. `love-ai` assists with drafting and summarisation but is not a business system of record.

The reference logical data stores are:

1. `user_db` — users, laundries, memberships, hotels, shops and client accounts;
2. operations storage — gate passes, deliveries, bills, shop bills, linen and returns;
3. accounting storage — customers, transactions, payments, expenses, employees and items.

Each service writes its own collections. Cross-service reads use authenticated service APIs, not direct cross-database joins.

## 5. Entity model

### 5.1 Laundries

A laundry has a stable `laundry_id`, display name, contact details, subscription information and status (`ACTIVE`, `SUSPENDED`, `ARCHIVED`). It is the tenant boundary for the core operations.

### 5.2 Hotels and shops

Hotels and shops are now first-class registry entities with:

- stable entity ID;
- display name and optional business code;
- associated active laundry;
- contact and address fields;
- status and lifecycle timestamps;
- creator attribution;
- member roster managed through explicit role assignments.

The entity registries are platform-admin operations. Entity IDs use the pattern `^[a-z0-9][a-z0-9_-]{0,31}$`.

### 5.3 Compatibility boundary

Existing hotel portal behavior remains scoped by the client's laundry and exact `client_name` pair where that is the current service contract. The registry gives the platform a stable hotel or shop identity for administration and membership. A complete operational backfill to `hotel_id` and `shop_id` is **planned**, not assumed.

## 6. Authentication and authorization

There are two intentionally different token shapes:

- **Staff token:** identity, staff token kind, active laundry and membership/capability information.
- **Client token:** client account identity, `token_kind=client` and `client_scope` containing the laundry and property scope; no top-level staff tenant claim and no staff capability list.

Staff endpoints fail closed when a client token lacks the staff tenant context. Hotel portal queries require both the issuing laundry and the hotel's scope. A foreign record behaves like a missing record so that identifiers cannot be probed across boundaries.

### Role summary

| Role | Scope | Typical authority |
|---|---|---|
| `PLATFORM_ADMIN` | Platform | Create/manage registries and platform users; approved support entry |
| `ADMIN` | One laundry | Full tenant administration and operations |
| `MANAGER` | One laundry | Operations, billing, reports and day close; no user administration |
| `STAFF` | One laundry | Operational entry with limited financial authority |
| `HOTEL_ADMIN` | One hotel entity/client scope | Hotel-side staff administration and portal access |
| `HOTEL_MANAGER` | One hotel entity/client scope | Hotel operational reading |
| `SHOP_ADMIN` | One shop entity | Shop staff administration and shop operations |
| `SHOP_STAFF` | One shop entity | Shop counter work without administration |
| `LINEN_SUPERVISOR` | One laundry | Linen writing, retirement and discrepancy ownership |
| `HOUSEKEEPER` | One laundry | Scan and processing actions within assigned capabilities |

### Non-negotiable security rules

1. Never resolve tenant or entity scope from a request body, query parameter or untrusted header.
2. Never grant an entity-admin role merely because a string says `ADMIN`; validate the entity and authority server-side.
3. Never place credentials in Vite `VITE_*` variables; browser variables are public.
4. Never delete issued financial records to hide corrections; use reversal, credit or adjustment records.
5. Never share logins. Individual identities are required for useful audit trails.
6. Never use support entry as an authorization bypass.

---

# Part III — Platform Administration

## 7. Platform-admin UI

The main administration UI now exposes a **Platform** group containing **Laundries**, **Users**, **Shops** and **Hotels**. These routes are client-guarded for usability and server-guarded for security. Tenant administrators are redirected away from the platform-only surface.

### 7.1 Laundries

Use the registry to register, edit, suspend, archive and inspect laundry tenants. A new laundry should have a first administrator enrolled before handover. The system should be tested in a private window with that administrator before the onboarding is considered complete.

### 7.2 Users

Use **Platform → Users** to create global identities and, for non-platform roles, enroll them into a laundry. A user is not the same thing as a membership. Removing a membership should not erase historical attribution or an identity that may belong elsewhere.

### 7.3 Shops

Use **Platform → Shops** to:

- search and filter shop entities;
- register a shop under an active laundry;
- edit business information;
- activate, suspend or archive the shop;
- inspect members;
- add or remove `SHOP_ADMIN` and `SHOP_STAFF` members.

### 7.4 Hotels

Use **Platform → Hotels** for the equivalent hotel lifecycle. The first administrator should be given `HOTEL_ADMIN`; additional hotel operational users should normally be `HOTEL_MANAGER` unless there is a documented administrative need.

## 8. Platform onboarding procedure

1. Confirm the request and the target laundry.
2. Confirm the entity ID is stable, lower-case and not a temporary nickname.
3. Confirm the associated laundry is active.
4. Create the entity.
5. Create or identify the first administrator.
6. Add the administrator to the entity roster with the correct role.
7. Ask the administrator to sign in and verify the visible entity name.
8. Record the handover and any support reference.
9. Do not begin operational migration until the identity and association checks pass.

## 9. Example platform flows

### Flow 1 — onboard a new hotel

```text
Platform Admin → Hotels → Register Hotel
        ↓
hotel_id: ocean-view
name: Ocean View Hotel
associated_laundry_id: harbour-laundry
        ↓
Save → ACTIVE hotel record
        ↓
Open details → Add ocean.admin as HOTEL_ADMIN
        ↓
Hotel signs in → confirms Ocean View scope
        ↓
Laundry staff create/operate passes; hotel reads its own records
```

### Flow 2 — onboard a new shop and counter user

```text
Platform Admin → Shops → Register Shop
        ↓
shop_id: city-express
associated_laundry_id: harbour-laundry
        ↓
Add city.owner as SHOP_ADMIN
        ↓
Shop Admin adds city.counter as SHOP_STAFF
        ↓
Counter staff sign in individually
        ↓
Quick bill → tender → receipt → shift handover → day close
```

### Flow 3 — suspend an entity

```text
Registry → Entity details → Suspend
        ↓
Entity becomes unavailable for new active context selection
        ↓
Investigate and preserve history
        ↓
Resolve → Activate
        ↓
Administrator signs in again and validates access
```

### Flow 4 — support entry

```text
Registry → Entity details → Enter
        ↓
Approved support investigation
        ↓
Reproduce without unapproved writes
        ↓
Exit support mode
        ↓
Return to platform-only surface and record outcome
```

---

# Part IV — Application Operations

## 10. Laundry application

The Laundry application is the full operational surface. The normal day begins with dashboard review, proceeds through collection and processing, and ends with reconciliation.

### Gate pass → delivery → bill

1. Create a gate pass at the physical handover.
2. Count and record every item line.
3. Scan or receive items in the Linen Room.
4. Record one or more deliveries against outstanding quantities.
5. Raise a bill from delivered quantities only.
6. Post payments as separate records.
7. Close the day after unbilled deliveries and collections are reconciled.

A delivery greater than the received quantity is rejected. A partial delivery keeps the pass open. An issued bill is corrected through a credit or adjustment, not by editing history.

## 11. Shop Counter application

The Shop Counter is optimized for fast transactions. Staff should use individual accounts, quick bill templates and a short handover checklist.

### Example: cash sale

1. Open **Quick Bill**.
2. Select the service lines and quantities.
3. Confirm the item count and total aloud.
4. Select cash and enter the amount tendered.
5. Confirm the calculated change.
6. Take payment and print the receipt.
7. At handover, resolve open bills and attach the drawer count.

Refunds, unusual discounts and day close require the appropriate supervisory authority.

## 12. Hotel Desk application

The Hotel Desk is a read-only operational and financial view for one property. A hotel can inspect passes, partial deliveries, issued invoices and statements. It cannot create or amend the laundry's evidence.

### Example: month-end reconciliation

1. Open **Statements** for the closed period.
2. Download the statement and referenced invoices.
3. Match invoices to approved purchase records.
4. Match payments to bank or petty-cash evidence.
5. Record one consolidated query with pass/invoice references.
6. Do not pay an unfamiliar invoice silently; report it the same day.

## 13. Linen Room application

The Linen Room uses a scan-driven state machine:

`new → collected → received → in wash → washed → pressed → ready → delivered`

Exceptions include missing, damaged and retired. A scan is attributed to the signed-in user and timestamp. There is no status dropdown that bypasses the physical event.

### Example: receiving a pass

1. Open the pass.
2. Count physical items by type.
3. Scan every tagged item.
4. Compare scanned count with the pass.
5. Record a short receipt if quantities differ.
6. Confirm receipt and start only the valid next transitions.

## 14. Quotations, bills and payments

A quotation is a priced offer. A bill is a statement of delivered work. A payment reduces a bill through a separate, auditable record. These are intentionally different documents.

### Example: disputed invoice

1. Keep the issued bill unchanged.
2. Identify the disputed line and source delivery.
3. Check the gate pass, delivery receiver and rate version.
4. If the bill is wrong, issue a credit or adjustment referencing the original.
5. If the delivery is wrong, record the correction with a reason.
6. Keep the original and the correction visible in the statement.

---

# Part V — Reliability, Security and Recovery

## 15. Daily controls

- Every collection has a gate pass.
- Every delivery has a receiver and quantities.
- Every delivered line is either billed or explicitly held.
- Every payment has a method and reference.
- Every refund or unusual discount has approval and a reason.
- Every linen discrepancy has an owner.
- Every shared terminal is handed over or signed out.
- Day close is never used to hide an unresolved exception.

## 16. Backups and disaster recovery

The application host is disposable; identity, operations and accounting data are state. Backups must be outside the host's blast radius and should be restored in the documented order. Recovery targets in the existing manual are policy targets until a real restore drill measures them.

### Recovery sequence

1. Declare the incident and stop unsafe writes.
2. Preserve logs and identify the failure domain.
3. Confirm the latest usable backup and replay window.
4. Restore identity first, then operations, then accounting.
5. Verify record counts, tenant scope, bills and payment balances.
6. Re-enable traffic gradually.
7. Document the recovery point, recovery time and unresolved gaps.

## 17. Incident response

Declare severity from business impact:

- **SEV1:** trading stops, sensitive data exposure or material data loss.
- **SEV2:** a major function is unavailable but recovery is possible without broad loss.
- **SEV3:** a degraded feature or limited user impact.
- **SEV4:** cosmetic or isolated inconvenience.

For a suspected credential compromise: disable the account, preserve evidence, determine the role and scope, rotate signing keys when necessary, and correct fraudulent actions through normal reversal paths.

## 18. Troubleshooting

| Symptom | First check | Safe action |
|---|---|---|
| 401 | Session expiry or wrong audience | Sign in again using the correct surface |
| 403 platform access | User is tenant admin, not platform admin | Ask a platform admin; do not alter the role locally |
| 403 capability | Role lacks the required capability | Request an approved membership/role review |
| Entity cannot be created | Duplicate ID or inactive laundry | Correct the ID or activate/choose the right laundry |
| Hotel sees no records | Scope spelling or account association | Verify exact entity/client association; do not broaden queries |
| Delivery quantity rejected | Quantity exceeds outstanding amount | Recount and correct the source pass with authorization |
| Day close blocked | Unbilled deliveries, open bills or unapproved refunds | Resolve the listed blockers and retry |
| Database unavailable | Connectivity, credentials or replica state | Stop writes and follow recovery procedure |

---

# Part VI — API and Verification Reference

## 19. Platform registry API summary

The user service exposes the following platform-admin resource families:

- `GET/POST /laundries`
- `GET/PUT /laundries/{laundry_id}`
- `POST /laundries/{laundry_id}/status`
- `GET/POST /laundries/{laundry_id}/members`
- `DELETE /laundries/{laundry_id}/members/{auth_id}`
- `POST /laundries/{laundry_id}/enter`
- `GET/POST /hotels`
- `GET/PUT /hotels/{hotel_id}`
- `POST /hotels/{hotel_id}/status`
- `GET/POST /hotels/{hotel_id}/members`
- `DELETE /hotels/{hotel_id}/members/{auth_id}`
- `POST /hotels/{hotel_id}/enter`
- `GET/POST /shops`
- `GET/PUT /shops/{shop_id}`
- `POST /shops/{shop_id}/status`
- `GET/POST /shops/{shop_id}/members`
- `DELETE /shops/{shop_id}/members/{auth_id}`
- `POST /shops/{shop_id}/enter`
- `GET/POST/PUT/PATCH /users...` for identity and membership operations as defined by the deployed user service.

Exact request models and response fields are generated by the running API's OpenAPI contract; this book intentionally does not invent fields that are not verified against the service.

## 20. Verification evidence

The repository's current evidence includes successful unit/build checks recorded in the test reports. The earlier baseline report recorded 68 passing user-service tests, 380 passing bill-service tests with two skipped, and successful builds for Shop, Hotel and Linen apps. A later refinement log records broader passing service suites and successful frontend builds.

The platform-admin UI addition was verified with a successful `quotations-ui` production build. The following remain important next checks:

- staging click-through with one laundry, two hotels and one shop;
- browser verification of platform-only access and support exit;
- real restore drill with measured RPO/RTO;
- CI repair for any excluded middleware test dependencies;
- performance/load testing under realistic operational volume.

Do not convert a build pass into a claim that a live deployment or production database migration occurred.

## 21. Release checklist

- [ ] Review changed API models and route guards.
- [ ] Run backend tests in isolated environments.
- [ ] Run frontend typecheck and production builds.
- [ ] Scan for secrets and unsafe client environment variables.
- [ ] Review tenant/entity isolation tests.
- [ ] Back up before any migration.
- [ ] Stage and verify entity backfill before production.
- [ ] Record release commit and configuration version.
- [ ] Perform post-release sign-in, entity registry and one operational smoke test.
- [ ] Keep rollback instructions beside the release ticket.

---

# Appendices

## A. Quick role decision

```text
Does the person manage the whole platform?
  Yes → PLATFORM_ADMIN
  No ↓
Does the person manage one laundry?
  Yes → ADMIN or MANAGER
  No ↓
Does the person manage one hotel?
  Yes → HOTEL_ADMIN or HOTEL_MANAGER
  No ↓
Does the person manage one shop?
  Yes → SHOP_ADMIN or SHOP_STAFF
  No ↓
Assign the narrowest operational role that completes the job.
```

## B. Onboarding checklist

- [ ] Business request recorded.
- [ ] Laundry selected and active.
- [ ] Entity ID reserved and checked.
- [ ] Entity created.
- [ ] First administrator created or identified.
- [ ] Membership assigned.
- [ ] Sign-in tested.
- [ ] Scope confirmed.
- [ ] Handover recorded.
- [ ] Migration or data backfill separately approved.

## C. Revision history

| Edition | Date | Summary |
|---|---|---|
| First complete issue | October 2026 | Architecture, security, application manuals, recovery and reference chapters |
| Second Edition | November 2026 | Platform-admin UI, first-class Hotel/Shop registries, user provisioning, entity flows, support entry, evidence labels and corrected implementation/future-state boundaries |

## D. Glossary additions

- **Entity registry:** platform-level lifecycle list for laundries, hotels and shops.
- **Platform-only surface:** UI and API area available only to a platform administrator.
- **Support entry:** controlled temporary context used to investigate an entity.
- **Entity ID:** stable lower-case identifier for a hotel or shop.
- **Compatibility field:** a retained legacy value, such as `client_name`, kept while migration is staged.

**End of Second Edition.**
