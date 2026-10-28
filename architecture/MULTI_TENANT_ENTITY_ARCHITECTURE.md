# Multi-Tenant Entity Architecture

## Overview

This document describes the complete multi-tenant entity architecture for the LoveLaundry system, which now supports three types of operational entities:

1. **Laundries** - Independent laundry businesses
2. **Hotels** - Hotel customers of laundries (now first-class entities)
3. **Shops** - Shop customers of laundries (now first-class entities)

Each entity type has its own registry, administrators, and scoped access control.

## Architectural Principles

### 1. Entity-Based Access Control

Every administrator is explicitly associated with exactly one entity type and instance:

- **Laundry Admins** manage a specific laundry
- **Hotel Admins** manage a specific hotel
- **Shop Admins** manage a specific shop
- **Platform Admins** manage all entities platform-wide

A role name alone does not grant access to any entity. The entity association is immutable and server-validated.

### 2. Strict Tenant Isolation

All entity-specific data is scoped to the entity ID from JWT claims:

- `laundry_id` for laundry operations
- `hotel_id` for hotel operations
- `shop_id` for shop operations

Cross-entity access is prevented at the API level through authorization checks, not just UI hiding.

### 3. Platform Admin Authority

Only Platform Admins can:
- Create new entity instances (laundries, hotels, shops)
- Create entity administrators (Laundry Admin, Hotel Admin, Shop Admin)
- Suspend or archive entities
- Access entity registries

Entity administrators cannot:
- Create other entity administrators
- Create entities of any type
- Access other entities' data

### 4. Data Ownership Path

Every tenant-owned record has a verifiable ownership path:

```
Platform Admin → Laundry Entity → Laundry Admin → Hotel Entity → Hotel Admin
                         ↓                    ↓
                    Operational Data    Operational Data
```

## Entity Collections

### Laundries Collection (`laundries`)

```python
{
  "_id": ObjectId,
  "laundry_id": str,  # Unique slug (e.g., "lovelaundry")
  "name": str,
  "br_number": str | None,
  "location": str | None,
  "address": str | None,
  "contact_number": str | None,
  "email": str | None,
  "logo_url": str | None,
  "icon": str | None,
  "description": str | None,
  "subscription_plan": str | None,
  "plan_limits": str | None,
  "status": str,  # ACTIVE, SUSPENDED, ARCHIVED
  "created_by": str,  # Platform admin auth_id
  "created_at": datetime,
  "updated_at": datetime
}
```

**Indexes:**
- Unique on `laundry_id`
- Index on `status`
- Index on `name`

### Hotels Collection (`hotels`)

```python
{
  "_id": ObjectId,
  "hotel_id": str,  # Unique slug (e.g., "hilton-colombo")
  "name": str,
  "hotel_code": str | None,
  "location": str | None,
  "address": str | None,
  "contact_number": str | None,
  "email": str | None,
  "logo_url": str | None,
  "icon": str | None,
  "description": str | None,
  "subscription_plan": str | None,
  "plan_limits": str | None,
  "associated_laundry_id": str,  # Which laundry this hotel belongs to
  "status": str,  # ACTIVE, SUSPENDED, ARCHIVED
  "created_by": str,  # Platform admin auth_id
  "created_at": datetime,
  "updated_at": datetime
}
```

**Indexes:**
- Unique on `hotel_id`
- Index on `associated_laundry_id`
- Index on `status`
- Index on `name`

### Shops Collection (`shops`)

```python
{
  "_id": ObjectId,
  "shop_id": str,  # Unique slug (e.g., "city-express")
  "name": str,
  "shop_code": str | None,
  "location": str | None,
  "address": str | None,
  "contact_number": str | None,
  "email": str | None,
  "logo_url": str | None,
  "icon": str | None,
  "description": str | None,
  "subscription_plan": str | None,
  "plan_limits": str | None,
  "associated_laundry_id": str,  # Which laundry this shop belongs to
  "status": str,  # ACTIVE, SUSPENDED, ARCHIVED
  "created_by": str,  # Platform admin auth_id
  "created_at": datetime,
  "updated_at": datetime
}
```

**Indexes:**
- Unique on `shop_id`
- Index on `associated_laundry_id`
- Index on `status`
- Index on `name`

## User Entity Associations

### Staff Users Collection (`users`)

Staff users have extended membership structure to support all entity types:

```python
{
  "laundries": [
    {
      "id": "laundry-slug",
      "name": "Laundry Name",
      "role": "ADMIN" | "MANAGER" | "STAFF",
      "status": "ACTIVE"
    }
  ],
  "hotels": [
    {
      "id": "hotel-slug",
      "name": "Hotel Name",
      "role": "HOTEL_ADMIN" | "HOTEL_MANAGER",
      "status": "ACTIVE"
    }
  ],
  "shops": [
    {
      "id": "shop-slug",
      "name": "Shop Name",
      "role": "SHOP_ADMIN" | "SHOP_STAFF",
      "status": "ACTIVE"
    }
  ]
}
```

### Client Accounts Collection (`client_accounts`)

Client accounts are enhanced with entity references:

```python
{
  "laundry_id": str,
  "client_type": "HOTEL" | "SHOP",
  "hotel_id": str | None,  # Reference to hotels collection
  "shop_id": str | None,  # Reference to shops collection
  "client_name": str,  # Kept for backward compatibility during migration
  "auth_id": str,
  "user_name": str,
  "password": str,
  "role_id": str,
  "status": str,
  "created_at": datetime,
  "updated_at": datetime
}
```

## JWT Claims Structure

### Staff User Token

```python
{
  "user_id": str,
  "auth_id": str,
  "user_name": str,
  "role": str,
  "status": str,
  "platform_admin": bool,
  "laundry_id": str,  # Active laundry (if applicable)
  "laundries": list,  # All laundry memberships
  "hotel_id": str,  # Active hotel (if applicable)
  "hotels": list,  # All hotel memberships
  "shop_id": str,  # Active shop (if applicable)
  "shops": list  # All shop memberships
}
```

### Client Account Token

```python
{
  "user_id": str,
  "auth_id": str,
  "user_name": str,
  "role": str,
  "platform_admin": False,
  "token_kind": "client",
  "client_scope": {
    "laundry_id": str,
    "hotel_id": str,  # NEW
    "shop_id": str,  # NEW
    "client_name": str,  # Kept for backward compatibility
    "client_type": "HOTEL" | "SHOP"
  }
}
```

## Access Control Matrix

| Role | Can Create | Can Manage | Scope |
|------|-----------|-----------|-------|
| PLATFORM_ADMIN | Laundries, Hotels, Shops | All entities | Platform-wide |
| LAUNDRY_ADMIN | Staff for their laundry | Laundry operations | Single laundry |
| HOTEL_ADMIN | Hotel staff for their hotel | Hotel operations | Single hotel (within laundry) |
| HOTEL_MANAGER | - | Hotel operations (read/write, no admin) | Single hotel |
| SHOP_ADMIN | Shop staff for their shop | Shop operations | Single shop (within laundry) |
| SHOP_STAFF | - | Shop operations (read/write, no admin) | Single shop |

## API Endpoints

### Entity Registry (Platform Admin only)

#### Laundries
- `GET /laundries` - List all laundries
- `GET /laundries/{laundry_id}` - Get laundry details
- `POST /laundries` - Create laundry
- `PUT /laundries/{laundry_id}` - Update laundry
- `POST /laundries/{laundry_id}/status` - Set laundry status
- `GET /laundries/{laundry_id}/members` - List laundry staff
- `POST /laundries/{laundry_id}/members` - Add staff to laundry
- `DELETE /laundries/{laundry_id}/members/{auth_id}` - Remove staff from laundry
- `POST /laundries/{laundry_id}/enter` - Platform admin support entry

#### Hotels
- `GET /hotels` - List all hotels
- `GET /hotels/{hotel_id}` - Get hotel details
- `POST /hotels` - Create hotel
- `PUT /hotels/{hotel_id}` - Update hotel
- `POST /hotels/{hotel_id}/status` - Set hotel status
- `GET /hotels/{hotel_id}/members` - List hotel staff
- `POST /hotels/{hotel_id}/members` - Add staff to hotel
- `DELETE /hotels/{hotel_id}/members/{auth_id}` - Remove staff from hotel
- `POST /hotels/{hotel_id}/enter` - Platform admin support entry

#### Shops
- `GET /shops` - List all shops
- `GET /shops/{shop_id}` - Get shop details
- `POST /shops` - Create shop
- `PUT /shops/{shop_id}` - Update shop
- `POST /shops/{shop_id}/status` - Set shop status
- `GET /shops/{shop_id}/members` - List shop staff
- `POST /shops/{shop_id}/members` - Add staff to shop
- `DELETE /shops/{shop_id}/members/{auth_id}` - Remove staff from shop
- `POST /shops/{shop_id}/enter` - Platform admin support entry

### User Entity Management

#### Laundry Staff
- `GET /users/{user_id}/laundries` - List laundry memberships
- `POST /users/{user_id}/laundries` - Grant laundry membership
- `PATCH /users/{user_id}/laundries/{laundry_id}` - Set laundry membership status
- `DELETE /users/{user_id}/laundries/{laundry_id}` - Revoke laundry membership
- `POST /auth/switch-laundry` - Switch active laundry context

#### Hotel Staff
- `GET /users/{user_id}/hotels` - List hotel memberships
- `POST /users/{user_id}/hotels` - Grant hotel membership
- `PATCH /users/{user_id}/hotels/{hotel_id}` - Set hotel membership status
- `DELETE /users/{user_id}/hotels/{hotel_id}` - Revoke hotel membership
- `POST /auth/switch-hotel` - Switch active hotel context

#### Shop Staff
- `GET /users/{user_id}/shops` - List shop memberships
- `POST /users/{user_id}/shops` - Grant shop membership
- `PATCH /users/{user_id}/shops/{shop_id}` - Set shop membership status
- `DELETE /users/{user_id}/shops/{shop_id}` - Revoke shop membership
- `POST /auth/switch-shop` - Switch active shop context

## Security Implementation

### Authorization Checks

1. **Platform Admin Verification**: Platform-only endpoints check `platform_admin` flag or `PLATFORM_ADMIN` role
2. **Entity Membership Verification**: All entity operations verify user has ACTIVE membership
3. **Cross-Entity Prevention**: Users cannot access data from entities they don't belong to
4. **Privilege Escalation Prevention**: Only Platform Admins can create entity admins

### Tenant Isolation

All resource services must:
1. Extract entity ID from JWT claims (never from request body/URL)
2. Scope all queries with entity ID filter
3. Validate entity ownership before mutations
4. Reject cross-entity linkages

### IDOR Prevention

- Never trust client-submitted entity IDs
- Always validate against user's memberships
- Return 404 for unauthorized access (don't reveal existence)

## Migration Strategy

### Phase 1: Schema Addition ✅
1. Add `hotels` and `shops` collections
2. Add `hotels` and `shops` fields to `users` model
3. Add `hotel_id` and `shop_id` fields to `client_accounts`
4. Update database indexes

### Phase 2: Entity Creation
1. Platform Admin creates hotel entities from existing `client_name` values
2. Platform Admin creates shop entities from existing `client_name` values
3. Each entity is associated with its laundry via `associated_laundry_id`

### Phase 3: Staff Migration
1. Identify staff who should be hotel/shop admins
2. Create appropriate entity memberships
3. Issue new tokens with updated claims

### Phase 4: Operational Data Migration
1. Backfill `hotel_id` on records using `client_name` → entity lookup
2. Backfill `shop_id` on records using `client_name` → entity lookup
3. Update queries to use entity IDs instead of client_name strings
4. Keep `client_name` for reporting/display (backward compatibility)

### Phase 5: Deprecation (Future)
1. After validation, phase out `client_name` as primary key
2. Enforce entity_id on all new records
3. Update frontend to use entity IDs

## Validation Rules

### Entity IDs
- 1-32 characters
- Lowercase letters, digits, hyphens, underscores
- Must be unique across system
- Regex: `^[a-z0-9][a-z0-9_-]{0,31}$`

### Entity Association
- Hotel must have `associated_laundry_id`
- Shop must have `associated_laundry_id`
- Laundry must exist and be ACTIVE

## Security Tests

Comprehensive tests verify:

1. **Entity Creation**
   - Platform Admin can create entities
   - Non-Platform Admin cannot create entities
   - Entity IDs must be unique
   - Entities must have valid associated laundry

2. **Membership Management**
   - Platform Admin can grant admin memberships
   - Non-Platform Admin cannot grant admin memberships
   - Entity admins can grant staff memberships
   - Cross-entity access is prevented

3. **Session Switching**
   - Users can switch to entities they belong to
   - Users cannot switch to entities they don't belong to
   - Suspended entities cannot be switched to

4. **Status Management**
   - Platform Admin can suspend entities
   - Non-Platform Admin cannot suspend entities
   - Suspension propagates to memberships

## Files Modified

### Database
- `user-service/src/user_service/database/main_db.py` - Added hotel/shop collections and indexes

### Models
- `user-service/src/user_service/models.py` - Updated user model structure
- `user-service/src/user_service/mongodb_repository.py` - Added hotel/shop support

### Routers
- `user-service/src/user_service/routers/hotels.py` - Hotel entity registry (NEW)
- `user-service/src/user_service/routers/shops.py` - Shop entity registry (NEW)
- `user-service/src/user_service/main.py` - Added hotel/shop membership endpoints

### Logic
- `user-service/src/user_service/entity_memberships.py` - Hotel/shop membership logic (NEW)
- `user-service/src/user_service/memberships.py` - Existing laundry membership logic

### Migration Scripts
- `user-service/scripts/migrate_hotels_to_entities.py` - Hotel migration script (NEW)
- `user-service/scripts/migrate_shops_to_entities.py` - Shop migration script (NEW)

### Tests
- `user-service/tests/test_hotel_entity_management.py` - Hotel entity tests (NEW)
- `user-service/tests/test_shop_entity_management.py` - Shop entity tests (NEW)

## Trust Boundaries

### Platform Admin Trust
- Can create any entity
- Can manage any entity
- Has full visibility
- Cannot be created by non-Platform Admins

### Entity Admin Trust
- Can manage only their assigned entity
- Can create staff for their entity
- Cannot create other entity admins
- Cannot access other entities

### Client Trust
- Scoped to single entity via `client_scope`
- Cannot access staff endpoints
- Cannot cross entity boundaries

## Failure Handling

### Entity Creation Failure
- Rollback: Delete created entity if membership assignment fails
- Compensating: Log failure, alert Platform Admin

### Membership Assignment Failure
- Rollback: Do not create user without membership
- Compensating: Require explicit retry

### Migration Failure
- Rollback: Use transaction where supported
- Compensating: Log orphaned records, provide repair script

## Auditing

All entity operations are logged with:
- `created_by` - Platform admin auth_id
- `created_at` - Timestamp
- `updated_at` - Timestamp for modifications

## Future Considerations

1. **Entity Deletion**: Currently only suspend/archive. Hard deletion requires cascade logic.
2. **Entity Transfer**: Moving an entity between laundries requires careful data migration.
3. **Entity Merging**: Combining duplicate entities needs business rules.
4. **Cross-Entity Reporting**: Analytics across entities requires Platform Admin access.
