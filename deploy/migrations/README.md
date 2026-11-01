# Database migration runbook

## Migration status

The multi-tenant migration is **not complete until the operator runs and verifies** `001_multi_tenant_backfill.py` against the actual production database. Application startup schema checks alone are not sufficient evidence.

## Safe procedure

1. Take and verify an encrypted backup.
2. Use a read-only credential to run a dry run:

```powershell
$env:MONGODB_MAIN_URI = "mongodb+srv://..."
$env:MONGODB_MAIN_DB = "laundry_management"
$env:MIGRATION_DEFAULT_TENANT = "lovelaundry"
python deploy/migrations/001_multi_tenant_backfill.py --dry-run
```

3. Review every `unassigned`, relationship `unresolved`, identity gap, and existing non-null tenant assignment. Stop if any legacy data belongs to more than the historical tenant or if a hotel/shop mapping is unresolved.
4. Run the apply phase with a migration-only credential:

```powershell
python deploy/migrations/001_multi_tenant_backfill.py --apply
```

5. Run verification:

```powershell
python deploy/migrations/001_multi_tenant_backfill.py --verify
```

6. Re-run the application security suites and reconciliation checks. Store the JSON output and migration run record with the release evidence.

## Safety properties

- Idempotent: already assigned records are not modified.
- Fail closed: unresolved unassigned records or missing tenant indexes fail verification.
- Relationship aware: child records inherit a tenant only from an assigned parent; missing/conflicting parents are reported instead of guessed.
- Platform admins are not converted into ordinary laundry memberships.
- No production database is contacted automatically by application startup.

The migration script has not been run against production from this workspace because production database access and authorization were not provided. Therefore production migration completion cannot be claimed yet.
