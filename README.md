# AI Pulse v3 — FastAPI + React + MongoDB

Gamified AI-readiness survey for JAIN (Deemed-to-be University), Office of Academics.
Rewrite of the single-file HTML prototype into a real stack.

```
ai-pulse/
├── backend/          FastAPI + Motor (async MongoDB)
│   ├── app/
│   │   ├── main.py         app factory, CORS, serves the built React app
│   │   ├── config.py       .env settings
│   │   ├── db.py           Mongo client + indexes
│   │   ├── instrument.py   the survey itself + scoring (single source of truth)
│   │   ├── schemas.py      request/response validation
│   │   ├── security.py     JWT admin auth
│   │   └── routers/        survey.py · admin.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── run.py              dev server
│   ├── demo_server.py      in-memory preview with 180 fake responses
│   └── smoke_test.py       offline end-to-end test
└── frontend/         Vite + React 18 + Recharts
    └── src/
        ├── pages/    Survey.jsx · Admin.jsx · AdminLogin.jsx · AdminDashboard.jsx
        ├── components/
        └── lib/      api.js · icons.jsx · avatar.js · chart.js
```

## What changed from the prototype

- **Name replaces the rank chip.** Students type their name on the welcome screen;
  the HUD shows `Ananya Sharma / Level 2 of 4` where it used to read `ROOKIE`. The
  name also greets them on levels 1 and 3 and headlines the result card.
- **Everything persists to MongoDB** — scores are computed server-side so nobody can
  edit their persona in devtools.
- **Admin dashboard** at `/admin`: JWT login, KPIs, persona and department analytics,
  item-level means, searchable/sortable response table, CSV export (full or anonymised).
- **Avatars are drawn locally** as inline SVG instead of calling an external avatar
  API, so they work on campus networks that block third-party hosts.
- **XP ceiling corrected** to 365 (17 answers × 10, level bonuses, achievements, reveal).

## 1 · Configure

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```ini
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=ai_pulse
ADMIN_USERNAME=ooa-admin
ADMIN_PASSWORD=<a real password>
JWT_SECRET=<openssl rand -hex 32>
PORT=8110
CORS_ORIGINS=https://jain-studentpulse.juooa.cloud
SERVE_FRONTEND=true
```

## 2 · Run locally

```bash
# backend
cd backend
pip install -r requirements.txt
python run.py                     # http://localhost:8110

# frontend (separate terminal, proxies /api to :8110)
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

No MongoDB handy? `python demo_server.py` runs the whole app on an in-memory
database with 180 seeded responses at <http://localhost:8096> (admin / demo1234).

## 3 · Build & serve as one service

```bash
cd frontend && npm run build      # writes frontend/dist
cd ../backend && python run.py    # FastAPI serves dist/ at /
```

Survey at `/`, admin at `/admin`, API docs at `/docs`.

## 4 · Deploy on the Hostinger VPS

The app runs on **port 8110** behind nginx on **31.97.186.191**
(DNS A record `jain-studentpulse` → `31.97.186.191`).

First deploy — one command as root on the VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/ooa-jain/student-pulse/main/deploy/hostinger-deploy.sh -o deploy.sh

DOMAIN=jain-studentpulse.juooa.cloud \
MONGO_URI='mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority' \
ADMIN_PASSWORD='<a real password>' \
CERTBOT_EMAIL=ooa.connect@jainuniversity.ac.in \
bash deploy.sh
```

It installs nginx/Node/Python/certbot, clones to `/var/www/ai-pulse`, writes
`backend/.env`, builds the frontend, installs the `ai-pulse` systemd service on
`127.0.0.1:8110`, configures nginx and gets the TLS certificate.

Re-deploy (pull, rebuild, restart — reuses the existing `.env`):

```bash
bash /var/www/ai-pulse/deploy/hostinger-deploy.sh
```

`deploy/HOSTINGER.md` has the full walkthrough — DNS, firewall, the `.env`
reference, health checks and troubleshooting. `deploy/ai-pulse.service` and
`deploy/nginx.conf` can also be copied into `/etc/systemd/system/` and
`/etc/nginx/sites-available/` by hand — both already carry the real hostname
and port.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/meta` | — | departments, levels, semesters, campuses, items, options, personas |
| GET | `/api/pulse` | — | public response counter |
| POST | `/api/submit` | — | submit a response, returns the scored persona |
| GET | `/api/result/{id}` | — | re-open a result card |
| GET | `/api/health` | — | app + database status |
| POST | `/api/admin/login` | — | username/password → JWT |
| GET | `/api/admin/me` | JWT | who am I |
| GET | `/api/admin/stats` | JWT | every aggregate the dashboard draws |
| GET | `/api/admin/responses` | JWT | paged, searchable, sortable table |
| DELETE | `/api/admin/responses/{id}` | JWT | remove one response |
| GET | `/api/admin/export.csv?anonymise=` | JWT | full or anonymised export |

## Identity questions

Level 1 collects age, department, programme (free text, optional) and then three
closed questions the dashboard slices on:

| Field | Values |
|---|---|
| `level` | Undergraduate · Postgraduate |
| `semester` | 1 – 8 |
| `campus` | Bangalore · Kochi |

All three are required and validated server-side against
`instrument.LEVELS / SEMESTERS / CAMPUSES`, so a crafted request cannot store a
value outside the list. They appear in the responses table (sortable, with
`?campus=` and `?level=` filters) and in both CSV exports. Responses collected
before these questions existed simply have the fields missing — the table shows
`—` and the stats group them under *Not recorded*.

## Scoring

- **Usage** = mean of the 5 frequency items.
- **Dependency** = mean of dependency items 1, 3, 4.
- **Critical thinking** = mean of items 2, 5, 6.
- **Persona** = quadrant of usage ≥ 3 × critical ≥ 3 →
  Power User / Autopilot / Cautious Critic / Explorer.
- **Readiness /100** = `usage×8 + critical×12 − dependency×4 + 20`, clamped.

Change any of it in `backend/app/instrument.py` — the frontend reads the questions
from `/api/meta`, so the two can never drift apart.

## Tests

```bash
cd backend
pip install mongomock_motor httpx
python smoke_test.py
```

Covers meta, submission, validation, auth (including rejection), stats aggregation,
the table, both CSV exports (asserting the anonymised one leaks no names), delete,
and all four persona quadrants.

## Notes

- Names are stored and shown to admins. The anonymised export replaces them with
  `R00001…` codes — use that copy for analysis you circulate.
- Chart colours were validated for colour-blind separation and contrast; the brand
  navy and gold are kept for UI chrome but swapped for chart-safe steps inside
  charts (see `frontend/src/lib/chart.js`).
