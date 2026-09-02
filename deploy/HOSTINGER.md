# Deploying AI Pulse on the Hostinger VPS

Target server: **31.97.186.191** · app port: **8110** (bound to `127.0.0.1`, nginx
terminates TLS in front of it).

## 1 · DNS

In Hostinger → *Domains* → *DNS / Nameservers*, the record is already in place:

| Type | Name              | Points to      | TTL |
|------|-------------------|----------------|-----|
| A    | jain-studentpulse | 31.97.186.191  | 300 |

So the site lives at **https://jain-studentpulse.juooa.cloud** — that hostname
is the default everywhere in `deploy/`, so you only pass `DOMAIN=` to override
it. Check the record has propagated before asking for a certificate:

```bash
dig +short jain-studentpulse.juooa.cloud     # must print 31.97.186.191
```

## 2 · Open the firewall

Hostinger VPS panel → *Firewall* (and on the box itself):

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

Port 8110 stays closed to the internet on purpose — nothing outside the VPS
should reach gunicorn directly.

## 3 · First deploy

SSH in as root and run the script. It installs nginx, Node 20, Python and
certbot, clones the repo to `/var/www/ai-pulse`, writes `backend/.env`, builds
the React app, creates the venv, installs the `ai-pulse` systemd service on port
8110, configures nginx and requests the TLS certificate.

```bash
ssh root@31.97.186.191

curl -fsSL https://raw.githubusercontent.com/ooa-jain/student-pulse/main/deploy/hostinger-deploy.sh -o deploy.sh

DOMAIN=jain-studentpulse.juooa.cloud \
MONGO_URI='mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority' \
ADMIN_USERNAME=ooa-admin \
ADMIN_PASSWORD='<a real password>' \
CERTBOT_EMAIL=ooa.connect@jainuniversity.ac.in \
bash deploy.sh
```

Using MongoDB Atlas? Add `31.97.186.191` to the cluster's IP access list first,
or the app starts but `/api/health` reports `database: unreachable`.

Prefer a local database? `apt install -y mongodb-org` (or Docker) and pass
`MONGO_URI='mongodb://localhost:27017'`.

## 4 · The `.env` file

The script writes `/var/www/ai-pulse/backend/.env` on the first run and never
overwrites it afterwards, so secrets survive re-deploys. `JWT_SECRET` is
generated with `openssl rand -hex 32`. To write it by hand instead:

```ini
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=ai_pulse

ADMIN_USERNAME=ooa-admin
ADMIN_PASSWORD=<a real password>
JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRE_MINUTES=480

APP_NAME=AI Pulse
PORT=8110
CORS_ORIGINS=https://jain-studentpulse.juooa.cloud
SERVE_FRONTEND=true
```

`backend/.env.example` is the same file with placeholders. It is loaded twice —
by pydantic-settings when the app starts, and by systemd through
`EnvironmentFile=` — so keep it to plain `KEY=value` lines with no `export` and
no quotes. It is gitignored; never commit the real one.

After editing it: `systemctl restart ai-pulse`.

## 5 · Re-deploying

```bash
bash /var/www/ai-pulse/deploy/hostinger-deploy.sh
```

It pulls `main`, rebuilds the frontend, reinstalls dependencies and restarts the
service. The domain is read back out of `.env`, so no variables are needed.

## 6 · Checks and troubleshooting

```bash
systemctl status ai-pulse
journalctl -u ai-pulse -f -n 100        # app logs
curl -s localhost:8110/api/health       # {"status":"ok","database":"connected"}
nginx -t && systemctl reload nginx
ss -lntp | grep 8110                    # gunicorn listening on loopback only
```

- **502 from nginx** — gunicorn is down or on another port; check
  `journalctl -u ai-pulse -n 50` and that `PORT=8110` in `.env` matches
  `--bind 127.0.0.1:8110` in the unit file.
- **`database: unreachable`** — Atlas IP allowlist, or a wrong `MONGO_URI`.
- **certbot fails** — DNS has not propagated yet, or port 80 is blocked. Fix,
  then `certbot --nginx -d jain-studentpulse.juooa.cloud --redirect`.
- **Blank page, API works** — the frontend build is missing:
  `cd /var/www/ai-pulse/frontend && npm ci && npm run build && systemctl restart ai-pulse`.

## Changing the port

Set it in three places and they must agree: `PORT=` in `backend/.env`,
`--bind 127.0.0.1:<port>` in `deploy/ai-pulse.service`, and both `proxy_pass`
lines in `deploy/nginx.conf`. Or just re-run the script with `PORT=<port>` —
it substitutes the unit file and the nginx site for you.
