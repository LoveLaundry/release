# Live linen channel (WebSocket)

Every linen change — a QR scan, a status edit, a bulk session, a tag
generation — is pushed to every screen that cares about it, instead of being
discovered by a poll.

```
bill_service                         quotations-ui
────────────                         ─────────────
linens.py  ──publish──▶  hub  ──▶  /ws/linen  ──▶  linenSocket ──▶ React Query cache
   │                      │                              │
   └── bump_live_clock ───┘                              └── clock poll (fallback only)
```

## Why both a socket and a clock

The WebSocket is the transport; the per-laundry **live clock** remains the
source of truth for "did I miss anything?".

* Connected screens patch their cache from the event payload and never poll.
* A screen whose socket is down polls `GET /linens/live-clock` once a second,
  exactly as it did before this feature.
* After a reconnect the client compares the server's clock (sent in `hello` and
  in every `pong`) with the last value it saw. A gap means events were published
  while it was disconnected, so it reconciles once.

This matters because a **serverless host (Vercel) cannot hold a WebSocket**. The
upgrade is rejected, the client reports `fallback`, and the app behaves exactly
as it did before: slower, but never stale. The container deployment
(`deploy/docker-compose.yml`) is where the socket is live.

## Channels

A connection is bound to exactly one laundry, taken from the signed token — not
from anything the client sends. Inside that laundry it can follow:

| Channel | Receives |
|---|---|
| `laundry` | every linen event in the laundry |
| `linen:LL-7K4P92` | only events that touch that tag |

A socket with no channels receives nothing but `hello`/`pong`. A tag channel
also receives a `bulk_scan` summary when that tag was part of the batch.

Screens use both: the app-level sync follows `laundry`, while a status screen
follows the one tag it is showing.

## Wire protocol

Client → server:

```json
{"type": "subscribe",   "channels": ["laundry", "linen:LL-7K4P92"]}
{"type": "unsubscribe", "channels": ["linen:LL-7K4P92"]}
{"type": "ping"}
{"type": "resync"}
```

Server → client:

```json
{"type": "hello", "laundry_id": "acme", "clock": 41, "channels": [], "server_time": "..."}
{"type": "subscribed", "channels": ["laundry", "linen:LL-7K4P92"], "added": [...]}
{"type": "pong", "at": "...", "clock": 41}
{"type": "error", "detail": "Malformed frame"}
```

```json
{
  "type": "linen.event",
  "event": "scan",
  "laundry_id": "acme",
  "clock": 42,
  "at": "2026-11-05T09:00:00+00:00",
  "action": "start_wash",
  "actor": {"user_id": "u-1", "name": "Nimal", "role": "STAFF"},
  "count": null,
  "linen": {
    "id": "6740…", "linen_id": "LL-7K4P92",
    "status": "WASHING", "previous_status": "AT_LAUNDRY",
    "wash_count": 5, "location": "Washer 3", "updated_at": "..."
  }
}
```

`event` is one of `scan`, `create`, `create_bulk`, `generate_tags`, `update`,
`delete`, `bulk_scan`.

The **snapshot travels with the event** so a client patches its cache instead of
refetching. A bulk scan publishes one `scan` event per tag plus one `bulk_scan`
summary; the client coalesces the burst into a single cache pass (120 ms).

## Authentication

A browser cannot set headers on a WebSocket handshake, so the JWT travels in the
query string of the upgrade request only:

```
wss://host/ws/linen?token=<jwt>
```

Consequences, both handled:

* the nginx block for this path has `access_log off`, so the token never lands
  in a log line;
* the handshake is accepted and then closed with an application code, so the
  browser can see **why** it was refused:

| Close code | Meaning | Client behaviour |
|---|---|---|
| 4401 | token invalid / expired | stop retrying, re-authenticate |
| 4403 | no active laundry in the token, or foreign origin | stop retrying |
| 1006 / other | transport dropped | exponential backoff, then `fallback` |

A `close()` *before* `accept()` would reach the browser as code 1006 — the same
as a network drop — so it could only retry blindly. That is why the refusal
happens after the upgrade: no frame is sent in between.

Cross-origin handshakes are refused at the upgrade (403) unless the origin is in
`ALLOWED_ORIGINS`.

## Deployment requirements

1. **`websockets` must be installed.** `uvicorn` ships no WebSocket protocol
   implementation of its own; without one it logs `Unsupported upgrade request`
   and answers the handshake with a plain HTTP error. It is pinned in
   `bill_service/requirements.txt`.
2. **One uvicorn worker.** The hub is in-process, which matches the image's
   single-process `CMD`. Running `--workers N` would give each worker its own
   hub, and a socket connected to worker A would miss a scan handled by worker
   B. Moving to multiple workers needs a shared broker behind
   `realtime.LinenHub.publish` — the call sites would not change.
3. **The proxy must upgrade.** `quotations-ui/nginx/default.conf` carries a
   dedicated `location /api/bills/ws/` block with `Upgrade`/`Connection`,
   `proxy_buffering off`, `access_log off` and a 1-hour read timeout (the client
   heartbeats every 20 s).
4. **Serverless is supported, degraded.** On Vercel the socket cannot attach; the
   client falls back to the clock poll automatically.

## Verifying a deployment

```bash
# from bill_service/
PYTHONPATH=src python scripts/ws_smoke.py
```

It boots the real router on a local port with an in-memory database, connects
as a browser would, and checks the handshake, `hello`, subscribe, fan-out, pong
and the 4401 refusal. Run it after any proxy or dependency change.

In the app, the live/polling badge on the linen dashboard, scanner, scan
session and linen profile reports which mode is active.

## Adding a new linen mutation

1. Bump the clock and publish in one call — they must never diverge:

```python
await _note_change(
    laundry_id, "reason",
    event="update",
    linen=linen_snapshot(doc, extra={"previous_status": before.get("status")}),
    actor=actor_of(current_user),
)
```

2. Add the event name to `LinenRealtimeEventName` in
   `quotations-ui/src/types/linen.ts`.
3. Decide how the client applies it in
   `quotations-ui/src/features/linen/realtime/apply-event.ts` — patch, invalidate,
   or remove.

Publishing is synchronous and non-blocking: it queues into a bounded per-connection
buffer, and a socket that cannot keep up is dropped rather than allowed to delay
the operator's scan response.
