# LoveLaundry Platform Administration Addendum

## Purpose

This addendum records the platform-administration capabilities added after the first complete manual issue. It is written as an operational companion to the main manual and is included in the Second Edition book and presentation.

## What changed

The platform now exposes a platform-only registry surface in the main administration UI:

- **Laundries** — create, edit, suspend, archive, inspect members, and enter a supported tenant session.
- **Users** — create and manage global staff identities, assign platform or laundry roles, and enroll eligible users into a laundry.
- **Shops** — register first-class shop entities, associate each with an active laundry, manage status, and manage shop members.
- **Hotels** — register first-class hotel entities, associate each with an active laundry, manage status, and manage hotel members.

These routes are guarded in the client and enforced again in the user service. A tenant `ADMIN` is not a platform administrator.

## Platform administration flow

```text
Platform Admin signs in
        ↓
Platform navigation: Laundries · Users · Shops · Hotels
        ↓
Select entity registry
        ↓
Create or edit entity
        ↓
Validate ID, associated laundry and status
        ↓
Assign members with an explicit role
        ↓
Review audit-relevant result
        ↓
Use support entry only when a tenant investigation is required
```

## Register a shop or hotel

1. Sign in with a `PLATFORM_ADMIN` account.
2. Open **Platform → Shops** or **Platform → Hotels**.
3. Select **Register Shop** or **Register Hotel**.
4. Provide the lowercase entity ID, display name, optional business code, location, contact details and description.
5. Select an **ACTIVE** laundry. The platform rejects a missing, suspended or archived laundry.
6. Save the record. The new entity starts in `ACTIVE` status.
7. Open the entity details and add the first administrator by user login name.
8. Confirm the member role: `SHOP_ADMIN` for shops or `HOTEL_ADMIN` for hotels.
9. Ask the administrator to sign in and verify the correct entity context.

### Validation rules

- Entity IDs are 1–32 characters.
- Allowed characters: lowercase letters, digits, hyphens and underscores.
- The first character must be a lowercase letter or digit.
- IDs are unique per entity registry.
- The associated laundry must exist and be `ACTIVE`.
- Status values are `ACTIVE`, `SUSPENDED` and `ARCHIVED`.
- Suspension or archival is preferred to deletion because historical records must remain attributable.

## Register a platform user

1. Open **Platform → Users**.
2. Select **Add User**.
3. Enter an individual login name, display name and initial password.
4. Choose one role:
   - `PLATFORM_ADMIN` for platform operations.
   - `ADMIN`, `MANAGER` or `STAFF` for a laundry membership.
5. For a non-platform role, choose the target laundry when the user is created.
6. Save and test sign-in with the user while the operator is present.
7. Never use shared accounts. Every privileged action must have one accountable identity.

A user identity and a membership are separate concepts. Removing a person's access from one laundry removes or suspends that membership; it does not erase the identity or historical attribution.

## Example flow A — new laundry, hotel and first staff member

**Scenario:** The platform operator onboards `harbour-laundry` and its first hotel customer.

1. Create laundry `harbour-laundry` with status `ACTIVE`.
2. Create user `harbour.owner` with role `ADMIN` and enroll it in `harbour-laundry`.
3. Open **Hotels** and register `ocean-view` under `harbour-laundry`.
4. Add `ocean.admin` to `ocean-view` with role `HOTEL_ADMIN`.
5. Add `ocean.housekeeping` with role `HOTEL_MANAGER`.
6. Ask the hotel administrator to sign in through the Hotel Desk surface.
7. Confirm the hotel can see only its own passes, deliveries, invoices and statements.
8. Confirm the laundry owner can see the new hotel in operational client selection.

**Expected boundary:** the hotel user cannot open staff routes, create gate passes or see another property's records.

## Example flow B — shop onboarding and counter handover

**Scenario:** `city-express` becomes a shop customer of `harbour-laundry`.

1. Register shop ID `city-express` under the active laundry.
2. Add `city.owner` as `SHOP_ADMIN`.
3. Add `city.counter` as `SHOP_STAFF`.
4. The shop administrator verifies the counter staff account.
5. Counter staff sign in to the Shop Counter app with individual credentials.
6. Staff complete quick bills and record tender.
7. The supervisor reviews open bills, refunds and discounts at handover.
8. The shop manager closes the day only after the drawer and card report reconcile.

**Expected boundary:** shop staff can operate shop workflows but cannot register entities, create platform users or manage another shop.

## Example flow C — suspend and recover an entity

1. Open the entity registry and inspect the entity details.
2. Select **Suspend** and confirm the reason through the normal administrative record.
3. Verify the entity no longer appears as an eligible active context.
4. Investigate the cause without deleting historical records.
5. Select **Activate** after the issue is resolved.
6. Ask an administrator to sign in again and confirm the expected scope.
7. If compromise is suspected, disable the affected account and follow the signing-key/session response procedure in the security chapters.

## Example flow D — platform support entry

1. Open the laundry, hotel or shop registry.
2. Select the entity and choose **Enter** only for an approved support investigation.
3. Record the support reason and ticket reference outside the normal tenant workflow.
4. Reproduce the issue without changing data unless the support procedure explicitly authorises the change.
5. Exit support mode and confirm the platform administrator has returned to the platform-only surface.
6. Never use support entry to bypass ordinary authorization or to conceal a correction.

## Current implementation versus future migration

The registries and UI are implemented. Operational services continue to preserve `client_name` for compatibility where that is the existing data contract. The complete migration from name-based client references to `hotel_id` and `shop_id` across all operational collections is a planned phase and must be executed with a backup, staged backfill, verification queries and rollback instructions.

Do not describe the migration as complete until the backfill and cross-service query changes have been executed and verified in staging.

## Verification checklist

- [ ] Platform-only routes are visible to `PLATFORM_ADMIN`.
- [ ] Tenant `ADMIN` cannot open platform registry routes.
- [ ] Duplicate entity IDs are rejected.
- [ ] Inactive associated laundries are rejected.
- [ ] Members receive only a role valid for the entity type.
- [ ] Entity status changes are visible in the registry.
- [ ] Historical records remain retained after suspension or archival.
- [ ] Support entry is auditable and exits cleanly.
- [ ] No client-side environment variable contains a secret.
- [ ] User-service and UI builds/tests pass before release.
