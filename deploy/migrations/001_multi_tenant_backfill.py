#!/usr/bin/env python3
"""Idempotent multi-tenant database migration and verification.

This migration is deliberately operator-run, not startup-run. It never changes
an existing non-null tenant assignment. Historical records with no assignment
are owned by the configured historical tenant and are stamped only after a
successful dry-run review.

Usage:
  python deploy/migrations/001_multi_tenant_backfill.py --dry-run
  python deploy/migrations/001_multi_tenant_backfill.py --apply
  python deploy/migrations/001_multi_tenant_backfill.py --verify

Required environment:
  MONGODB_MAIN_URI or DATABASE_URL
  MONGODB_MAIN_DB or MONGODB_DB_NAME
Optional:
  MIGRATION_DEFAULT_TENANT=lovelaundry
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Iterable

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, OperationFailure

MIGRATION_ID = "001_multi_tenant_backfill"
MIGRATION_VERSION = 1
DEFAULT_TENANT = "lovelaundry"

# Every collection listed here contains operational records owned by a laundry.
TENANT_COLLECTIONS: tuple[str, ...] = (
    # quotation-service
    "quotations",
    "garment_tags",
    "chat_conversations",
    "chat_messages",
    # user-service client accounts
    "client_accounts",
    # bill-service
    "bills",
    "gatepasses",
    "deliveries",
    "dispatch_jobs",
    "payments",
    "loyalty_accounts",
    "audit_logs",
    "linens",
    "linen_events",
    "live_clocks",
    "returns",
    "adjustments",
    "shop_bills",
    "bill_templates",
    "legacy_invoices",
    "rewashes",
    "monthly_entries",
    "linen_category_mappings",
    "manual_references",
    "idempotency_keys",
    # laundry-management
    "clients",
    "customers",
    "customer_rates",
    "categories",
    "items",
    "transactions",
    "employees",
    "salaries",
    "attendance",
    "salary_advances",
    "salary_slips",
    "salary_packages",
    "holidays",
    "extra_work_categories",
    "extra_work_records",
    "company_settings",
    "electricity_meter_readings",
    "expense_categories",
    "expenses",
    "expense_templates",
    "imports",
    "saved_reports",
    # worker-service
    "workers",
    "daily_task_logs",
)

SERVICE_COLLECTIONS = {
    "quotation-service": {
        "quotations", "garment_tags", "chat_conversations", "chat_messages"
    },
    "bill-service": {
        "bills", "gatepasses", "deliveries", "dispatch_jobs", "payments",
        "loyalty_accounts", "audit_logs", "linens", "linen_events",
        "live_clocks", "returns", "adjustments", "shop_bills", "bill_templates",
        "legacy_invoices", "rewashes", "monthly_entries",
        "linen_category_mappings", "manual_references",
    },
    "user-service": {"client_accounts"},
    "laundry-management": {
        "clients", "customers", "customer_rates", "categories", "items",
        "transactions", "payments", "employees", "salaries", "attendance",
        "salary_advances", "salary_slips", "salary_packages", "holidays",
        "extra_work_categories", "extra_work_records", "company_settings",
        "electricity_meter_readings", "expense_categories", "expenses",
        "expense_templates", "imports", "audit_logs", "saved_reports",
    },
    "worker-service": {"workers", "daily_task_logs"},
}

RELATIONSHIPS: tuple[tuple[str, str, str], ...] = (
    ("garment_tags", "quotation_id", "quotations"),
    ("chat_messages", "conversation_id", "chat_conversations"),
    ("deliveries", "gate_pass_id", "gatepasses"),
    ("payments", "bill_id", "bills"),
    ("linen_events", "linen_id", "linens"),
    ("returns", "gate_pass_id", "gatepasses"),
    ("adjustments", "gate_pass_id", "gatepasses"),
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def resolve_connection() -> tuple[str, str]:
    uri = "mongodb+srv://lovelaundry01_db_user:xd5Vv3sVOOCjlYhn@lovelaundry.12kgzcw.mongodb.net/?appName=LoveLaundry"
    db_name = "laundry_management"
    
    if not uri:
        raise SystemExit("MONGODB_MAIN_URI or DATABASE_URL is required")
    if not db_name:
        raise SystemExit("MONGODB_MAIN_DB or MONGODB_DB_NAME is required")
    if not uri.startswith(("mongodb://", "mongodb+srv://")):
        raise SystemExit("Migration only accepts a MongoDB connection URI")
    return uri, db_name


def resolve_tenant() -> str:
    tenant = (os.getenv("MIGRATION_DEFAULT_TENANT") or DEFAULT_TENANT).strip().lower()
    if not tenant or len(tenant) > 64 or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in tenant):
        raise SystemExit("MIGRATION_DEFAULT_TENANT must be a safe lowercase tenant slug")
    return tenant


def unassigned_filter() -> dict[str, Any]:
    return {"$or": [{"laundry_id": {"$exists": False}}, {"laundry_id": None}, {"laundry_id": ""}]}


def collection_plan(db: Any) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    available = set(db.list_collection_names())
    for name in TENANT_COLLECTIONS:
        collection = db[name]
        exists = name in available
        total = collection.estimated_document_count() if exists else 0
        missing = collection.count_documents(unassigned_filter()) if exists else 0
        foreign = collection.count_documents({"laundry_id": {"$exists": True, "$nin": [None, ""]}}) if exists else 0
        plan.append({
            "collection": name,
            "exists": exists,
            "total": total,
            "unassigned": missing,
            "assigned": max(0, total - missing),
            "non_null_assignments": foreign,
        })
    return plan


def index_specs() -> Iterable[tuple[str, list[tuple[str, int]], dict[str, Any]]]:
    for name in TENANT_COLLECTIONS:
        # Added background=True to prevent collection locks on large production collections
        yield name, [("laundry_id", 1)], {"name": "tenant_laundry_id", "background": True}
        yield name, [("laundry_id", 1), ("created_at", -1)], {"name": "tenant_created_at", "background": True}


def create_indexes(db: Any, dry_run: bool) -> list[dict[str, Any]]:
    results = []
    existing = set(db.list_collection_names())
    for name, keys, options in index_specs():
        if name not in existing:
            results.append({"collection": name, "keys": keys, "status": "skipped_missing_collection"})
            continue
        if dry_run:
            results.append({"collection": name, "keys": keys, "status": "planned"})
            continue
        try:
            db[name].create_index(keys, **options)
            results.append({"collection": name, "keys": keys, "status": "created_or_present"})
        except OperationFailure as e:
            results.append({"collection": name, "keys": keys, "status": f"error: {str(e)}"})
    return results


def _backfill_legacy_memberships(db: Any, tenant: str, dry_run: bool) -> dict[str, Any]:
    if "users" not in db.list_collection_names():
        return {"collection": "users", "would_update": 0, "updated": 0, "skipped": "missing"}
    collection = db["users"]
    filt = {
        "$and": [
            {"$or": [{"laundries": {"$exists": False}}, {"laundries": {"$size": 0}}]},
            {"platform_admin": {"$ne": True}},
            {"role_id": {"$nin": ["PLATFORM_ADMIN", "platform_admin"]}},
        ]
    }
    count = collection.count_documents(filt)
    updated = 0
    if not dry_run and count:
        result = collection.update_many(
            filt,
            {"$set": {"laundries": [{"id": tenant, "name": "Love Laundry", "status": "ACTIVE"}]}},
        )
        updated = result.modified_count
    return {"collection": "users", "would_update": count, "updated": updated, "tenant": tenant}


def _propagate_parent_tenants(db: Any, dry_run: bool) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    existing = set(db.list_collection_names())
    for child_name, foreign_key, parent_name in RELATIONSHIPS:
        if child_name not in existing or parent_name not in existing:
            continue
        child = db[child_name]
        parent = db[parent_name]
        candidates = child.find(unassigned_filter(), {foreign_key: 1})
        updated = 0
        unresolved = 0
        for row in candidates:
            ref = row.get(foreign_key)
            if ref is None:
                unresolved += 1
                continue
            parent_row = parent.find_one({"_id": ref}, {"laundry_id": 1})
            if parent_row is None:
                parent_row = parent.find_one({"id": str(ref)}, {"laundry_id": 1})
            parent_tenant = (parent_row or {}).get("laundry_id")
            if not parent_tenant:
                unresolved += 1
                continue
            if not dry_run:
                child.update_one({"_id": row["_id"]}, {"$set": {"laundry_id": parent_tenant}})
            updated += 1
        changes.append({
            "child": child_name,
            "parent": parent_name,
            "foreign_key": foreign_key,
            "propagated": updated,
            "unresolved": unresolved,
            "dry_run": dry_run,
        })
    return changes


def apply_backfill(db: Any, tenant: str, dry_run: bool) -> list[dict[str, Any]]:
    relationship_changes = _propagate_parent_tenants(db, dry_run)
    changes = [{
        "legacy_memberships": _backfill_legacy_memberships(db, tenant, dry_run),
        "relationship_propagation": relationship_changes,
    }]
    relationship_children = {child for child, _foreign_key, _parent in RELATIONSHIPS}
    existing = set(db.list_collection_names())
    for name in TENANT_COLLECTIONS:
        if name not in existing:
            continue
        collection: Collection = db[name]
        filt = unassigned_filter()
        count = collection.count_documents(filt)
        if name in relationship_children:
            changes.append({
                "collection": name,
                "would_update": 0,
                "updated": 0,
                "unresolved_remaining": count,
                "tenant": tenant,
            })
            continue
        if not dry_run and count:
            result = collection.update_many(filt, {"$set": {"laundry_id": tenant}})
            changed = result.modified_count
        else:
            changed = 0
        changes.append({
            "collection": name,
            "would_update": count,
            "updated": changed,
            "tenant": tenant,
        })
    return changes


def verify(db: Any, tenant: str) -> dict[str, Any]:
    plan = collection_plan(db)
    failures = [row for row in plan if row["unassigned"] > 0]
    identity_failures: list[dict[str, Any]] = []
    if "users" in db.list_collection_names():
        users_missing = db["users"].count_documents({
            "$or": [
                {"laundries": {"$exists": False}},
                {"laundries": {"$size": 0}},
            ]
        })
        if users_missing:
            identity_failures.append({"collection": "users", "missing_membership": users_missing})
    index_failures: list[dict[str, Any]] = []
    for name in TENANT_COLLECTIONS:
        if name not in db.list_collection_names():
            continue
        names = {item["name"] for item in db[name].list_indexes()}
        if "tenant_laundry_id" not in names:
            index_failures.append({"collection": name, "missing": "tenant_laundry_id"})
    return {
        "ok": not failures and not identity_failures and not index_failures,
        "unassigned": failures,
        "identity_gaps": identity_failures,
        "missing_indexes": index_failures,
        "tenant": tenant,
    }


def manifest_digest(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def write_run_record(db: Any, mode: str, tenant: str, payload: dict[str, Any]) -> None:
    record = {
        "migration_id": MIGRATION_ID,
        "version": MIGRATION_VERSION,
        "mode": mode,
        "tenant": tenant,
        "completed_at": utc_now(),
        "digest": manifest_digest(payload),
        "payload": payload,
    }
    db["schema_migrations"].insert_one(record)


def run(mode: str) -> int:
    uri, db_name = resolve_connection()
    tenant = resolve_tenant()
    
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB cluster: {e}", file=sys.stderr)
        return 1

    try:
        db = client[db_name]
        before = collection_plan(db)
        if mode == "verify":
            result = verify(db, tenant)
            print(json.dumps(result, indent=2, default=str))
            return 0 if result["ok"] else 2

        dry_run = mode == "dry-run"
        changes = apply_backfill(db, tenant, dry_run=dry_run)
        indexes = create_indexes(db, dry_run=dry_run)
        after = collection_plan(db)
        payload = {
            "before": before,
            "changes": changes,
            "indexes": indexes,
            "after": after,
        }
        print(json.dumps(payload, indent=2, default=str))
        if dry_run:
            print("DRY RUN ONLY: no records or indexes were changed")
            return 0

        verification = verify(db, tenant)
        payload["verification"] = verification
        if not verification["ok"]:
            print(json.dumps(verification, indent=2, default=str), file=sys.stderr)
            return 2
        write_run_record(db, mode="apply", tenant=tenant, payload=payload)
        print(f"Migration {MIGRATION_ID} applied and verified for tenant {tenant}")
        return 0
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="report planned changes without writing")
    group.add_argument("--apply", action="store_true", help="backfill records, create indexes, and verify")
    group.add_argument("--verify", action="store_true", help="verify no unassigned records and required indexes")
    args = parser.parse_args()
    return run("dry-run" if args.dry_run else "apply" if args.apply else "verify")


if __name__ == "__main__":
    raise SystemExit(main())