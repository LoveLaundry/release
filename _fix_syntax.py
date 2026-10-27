"""Repair the duplicated/truncated method block and the unclosed query.

Both files were damaged by an automated patch that pasted a second copy of each
method and cut a call in half. Restoring one definition of each, preserving the
original behaviour.
"""
import io
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

# ── quotation-service: tenant collection wrapper ──────────────────────────────
P1 = os.path.join(ROOT, "quotation-service", "src", "quotation_service", "tenant_scope.py")
src = io.open(P1, encoding="utf-8").read()

start = src.index("# ── writes")
end = src.index("    def __getattr__")

CLEAN = '''    # ── writes ─────────────────────────────────────────────────────────────
    def insert_one(self, document, *args, **kwargs):
        return self._collection.insert_one(self._stamp(document), *args, **kwargs)

    def insert_many(self, documents, *args, **kwargs):
        return self._collection.insert_many(
            [self._stamp(d) for d in documents], *args, **kwargs
        )

    def update_one(self, filter, update, *args, **kwargs):
        return self._collection.update_one(self._scope(filter), update, *args, **kwargs)

    def update_many(self, filter, update, *args, **kwargs):
        return self._collection.update_many(self._scope(filter), update, *args, **kwargs)

    def replace_one(self, filter, replacement, *args, **kwargs):
        return self._collection.replace_one(
            self._scope(filter), self._stamp(replacement), *args, **kwargs
        )

    def delete_one(self, filter, *args, **kwargs):
        return self._collection.delete_one(self._scope(filter), *args, **kwargs)

    def delete_many(self, filter, *args, **kwargs):
        return self._collection.delete_many(self._scope(filter), *args, **kwargs)

    def find_one_and_update(self, filter, update, *args, **kwargs):
        return self._collection.find_one_and_update(
            self._scope(filter), update, *args, **kwargs
        )

    def find_one_and_delete(self, filter, *args, **kwargs):
        return self._collection.find_one_and_delete(self._scope(filter), *args, **kwargs)

    def distinct(self, key, filter=None, *args, **kwargs):
        return self._collection.distinct(key, self._scope(filter), *args, **kwargs)

'''

src = src[:start] + CLEAN + src[end:]
io.open(P1, "w", encoding="utf-8", newline="\n").write(src)
print("tenant_scope repaired")

# ── laundry-management: overlapping-slip lookup ───────────────────────────────
P2 = os.path.join(ROOT, "laundry-management", "src", "routers", "salary.py")
src2 = io.open(P2, encoding="utf-8").read()

pattern = re.compile(
    r"async def _find_overlapping_slip\(.*?return await salary_slips_collection\(\)\.find_one\(query\)",
    re.S,
)
NEW = '''async def _find_overlapping_slip(
    employee_id: str,
    start_str: str,
    end_str: str,
    laundry_id: Optional[str] = None,
) -> Optional[dict]:
    """Return the first non-cancelled/deleted slip whose date range overlaps
    [start_str, end_str] for the same employee. Prevents the same date from
    being paid more than once (e.g. weekly slip + custom range slip)."""
    query = {
        "employee_id": employee_id,
        "status": {"$nin": ["CANCELLED", "DELETED"]},
        "period_start": {"$lte": end_str},
        "period_end": {"$gte": start_str},
    }
    if laundry_id:
        query = scoped_query(query, laundry_id)
    return await salary_slips_collection().find_one(query)'''

src2, n = pattern.subn(NEW, src2, count=1)
io.open(P2, "w", encoding="utf-8", newline="\n").write(src2)
print("salary.py repaired:", n == 1)
