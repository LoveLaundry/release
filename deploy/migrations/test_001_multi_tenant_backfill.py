"""Regression tests for the operator-run tenant migration.

Run with:
    python -m pytest deploy/migrations/test_001_multi_tenant_backfill.py
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

try:
    import mongomock
except ImportError:  # pragma: no cover - dependency is supplied by dev requirements
    mongomock = None

SCRIPT = Path(__file__).with_name("001_multi_tenant_backfill.py")
SPEC = importlib.util.spec_from_file_location("tenant_migration", SCRIPT)
MIGRATION = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MIGRATION)


pytestmark = pytest.mark.skipif(mongomock is None, reason="mongomock is required for migration tests")


def test_missing_parent_is_not_guessed_into_historical_tenant():
    db = mongomock.MongoClient().get_database("test")
    db["garment_tags"].insert_one({"_id": "tag-1", "quotation_id": "missing-parent"})

    changes = MIGRATION.apply_backfill(db, "lovelaundry", dry_run=False)

    assert db["garment_tags"].find_one({"_id": "tag-1"}).get("laundry_id") is None
    assert changes[0]["relationship_propagation"][0]["unresolved"] == 1
    assert MIGRATION.verify(db, "lovelaundry")["ok"] is False


def test_assigned_parent_propagates_to_child():
    db = mongomock.MongoClient().get_database("test")
    db["quotations"].insert_one({"_id": "quote-1", "laundry_id": "other-laundry"})
    db["garment_tags"].insert_one({"_id": "tag-1", "quotation_id": "quote-1"})

    MIGRATION.apply_backfill(db, "lovelaundry", dry_run=False)

    assert db["garment_tags"].find_one({"_id": "tag-1"})["laundry_id"] == "other-laundry"


def test_historical_root_record_is_backfilled_and_idempotent():
    db = mongomock.MongoClient().get_database("test")
    db["quotations"].insert_one({"_id": "quote-1", "quotation_title": "legacy"})

    first = MIGRATION.apply_backfill(db, "lovelaundry", dry_run=False)
    second = MIGRATION.apply_backfill(db, "lovelaundry", dry_run=False)

    assert db["quotations"].find_one({"_id": "quote-1"})["laundry_id"] == "lovelaundry"
    assert next(row for row in first if row.get("collection") == "quotations")["updated"] == 1
    assert next(row for row in second if row.get("collection") == "quotations")["updated"] == 0
