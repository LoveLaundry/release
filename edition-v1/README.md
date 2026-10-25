# LoveLaundry — Edition v1 (monorepo)

One repository containing the whole platform: six Python services, four React
front-ends, a Flutter driver app, the marketing site, the deployment stack and
the system manual.

**BEYO.ND · BEYOND — N-DIMENSIONAL**
_"Behold. Yesterday is oncoming."_

---

## Layout

```
edition-v1/
├─ bill_service/            gate passes, deliveries, bills, linens, shop bills, client portal
├─ user-service/            auth, laundries (tenants), memberships, hotel/shop client accounts
├─ quotation-service/       quotations
├─ laundry-management/      accounting: customers, transactions, expenses, salaries
├─ worker-service/          workers
├─ love-ai/                 AI helpers
├─ lovelaundry-bot/         chat/automation bot
├─ quotations-ui/           React app — the laundry-side UI
├─ shop-app/                React app — shop client portal
├─ hotel-app/               React app — hotel client portal
├─ linen-room-app/          React app — linen room scanning
├─ guest-billing/           standalone bill printing tool
├─ public.lovelaundry.lk/   marketing site
├─ LoveMobi/                Flutter driver app
├─ deploy/                  docker compose + env example for the whole stack
├─ architecture/            app-split plan and the API URI checker
└─ docs/                    system manual (PDF/Word/HTML/LaTeX), registration guide, test report
```

## Services and ports

Every backend listens on `:8000` inside the compose network. nginx publishes a
single origin and rewrites path prefixes, which is why the front-ends call
`/api/user/...` and `/api/bills/...` rather than host:port pairs.

| Prefix | Service |
|---|---|
| `/api/user` | user-service |
| `/api/bills` | bill_service |
| `/api/quotes` | quotation-service |

## Running the stack

```bash
cp deploy/backend.env.example deploy/.env      # then fill in the values
docker compose -f deploy/docker-compose.yml up --build
```

The stack expects MongoDB. Nothing else is required.

## Front-ends

| App | Dev | Production path |
|---|---|---|
| quotations-ui | `npm run dev` | `/` |
| shop-app | `npm run dev -- --port 5174` | `/shop` |
| hotel-app | `npm run dev -- --port 5175` | `/hotel` |
| linen-room-app | `npm run dev -- --port 5176` | `/linen` |

Each app proxies `/api` to the same host in development, so request paths are
identical in dev and production.

## The one rule that matters

Data is isolated by `laundry_id`, and for client accounts additionally by
`client_name`. Staff tokens carry `laundry_id` and a `laundries` membership list.
Hotel and shop tokens carry only a `client_scope` and deliberately **no**
`laundry_id`/`laundries`, so every staff endpoint refuses them by construction
rather than by an explicit check that someone could forget.

See `docs/REGISTRATION.md` for creating hotels, shops and their staff, and
`docs/manual/` for the full manual (139 pages).

## Tests

```bash
cd user-service    && .venv/Scripts/python -m pytest tests/ -q
cd bill_service    && .venv/Scripts/python -m pytest tests/ -q --ignore=tests/test_security_middleware.py
cd quotations-ui   && npm run build
```

Latest run: **80 passed** (user-service), **393 passed / 2 skipped**
(bill_service), all front-ends building.

## Secrets

No `.env` file is committed. Each service ships a `.env.example`; the real values
live only in the deployment environment. `deploy/backend.env.example` lists what
the stack needs.
