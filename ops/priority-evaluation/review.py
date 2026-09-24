#!/usr/bin/env python3
"""Small operator CLI for code-review and delivery state transitions."""

import json
import re
import subprocess
import sys

TABLE = "bh_priority_evaluation_requests"
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def query(statement: str) -> str | None:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", statement],
        text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise RuntimeError("database operation failed")
    return result.stdout.strip() or None


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "list":
        data = query(f"""
          SELECT COALESCE(json_agg(row_data ORDER BY created_at)::text,'[]') FROM (
            SELECT json_build_object('id',id::text,'status',status,'email',email,
              'model',model_name,'benchmarks',benchmarks,'visibility',visibility,'amount_total',amount_total,
              'stripe_mode',stripe_mode,'review_passed_at',review_passed_at) AS row_data, created_at
            FROM {TABLE} WHERE status IN ('paid','review_passed','refund_due','refund_pending')
          ) AS open_requests
        """)
        rows = json.loads(data or "[]")
        if not rows:
            print("No open priority requests.")
            return 0
        for row in rows:
            amount = row.get("amount_total") or 0
            print(f"{row['id']}  {row['stripe_mode'].upper()}  {row['status']}  {row['email']}  {row['model']}  {', '.join(row['benchmarks'])}  ${amount / 100:.2f}")
        return 0

    if len(sys.argv) != 3 or not UUID_RE.fullmatch(sys.argv[1]) or sys.argv[2] not in ("pass", "refuse", "complete"):
        print("usage: jevbench-review list | REQUEST_ID pass|refuse|complete", file=sys.stderr)
        return 2
    request_id, action = sys.argv[1], sys.argv[2]
    transitions = {
        "pass": "UPDATE {table} SET status='review_passed', review_passed_at=now(), updated_at=now() WHERE id='{id}'::uuid AND status='paid' AND payment_intent_id IS NOT NULL RETURNING id",
        "refuse": "UPDATE {table} SET status='refund_due', refund_status=NULL, updated_at=now() WHERE id='{id}'::uuid AND status='paid' AND payment_intent_id IS NOT NULL RETURNING id",
        "complete": "UPDATE {table} SET status='completed', result_delivered_at=now(), updated_at=now() WHERE id='{id}'::uuid AND status='review_passed' RETURNING id",
    }
    changed = query(transitions[action].format(table=TABLE, id=request_id))
    if not changed:
        print("No transition made. Check the request state with `jevbench-review list`.", file=sys.stderr)
        return 1
    descriptions = {"pass": "Code review passed; the 48-hour delivery window has started.", "refuse": "Request refused; automatic full refund is queued.", "complete": "Result delivery recorded."}
    print(descriptions[action])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"jevbench-review: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
