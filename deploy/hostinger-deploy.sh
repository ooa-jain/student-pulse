#!/usr/bin/env bash
#
# AI Pulse — one-command deploy for the Hostinger VPS (31.97.186.191).
#
#   DNS (Hostinger → Domains → DNS zone):
#       Type  Name               Points to        TTL
#       A     jain-studentpulse  31.97.186.191    300
#
# First run (as root on the VPS):
#
#   curl -fsSL https://raw.githubusercontent.com/ooa-jain/student-pulse/main/deploy/hostinger-deploy.sh -o deploy.sh
#   MONGO_URI='mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority' \
#   ADMIN_PASSWORD='a real password' \
#   CERTBOT_EMAIL=ooa.connect@jainuniversity.ac.in \
#   bash deploy.sh
#
# Later runs (pull + rebuild + restart) — everything is remembered in
# backend/.env, so plain `bash /var/www/ai-pulse/deploy/hostinger-deploy.sh`
# is enough.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ai-pulse}"
REPO_URL="${REPO_URL:-https://github.com/ooa-jain/student-pulse.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-8110}"
DOMAIN="${DOMAIN:-}"
DEFAULT_DOMAIN="jain-studentpulse.juooa.cloud"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
SERVICE_NAME="ai-pulse"
RUN_USER="www-data"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*" >&2; }
die()  { printf '\n\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

# Ubuntu's unattended-upgrades often holds the dpkg lock on a fresh boot;
# wait for it instead of dying halfway through the deploy.
apt() { apt-get -o DPkg::Lock::Timeout=600 "$@"; }

[ "$(id -u)" -eq 0 ] || die "run this as root (sudo bash $0)"

# ---------------------------------------------------------------- packages ---
say "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt update -qq || warn "apt-get update had errors (unreachable mirror?) — continuing with the cached index"
apt install -y -qq git curl ca-certificates nginx python3 python3-venv python3-pip

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 18 ]; then
    say "Installing Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y -qq nodejs
fi

# -------------------------------------------------------------------- code ---
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [ -d "$APP_DIR/.git" ]; then
    say "Updating $APP_DIR"
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
    say "Cloning into $APP_DIR"
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

ENV_FILE="$APP_DIR/backend/.env"

# Re-deploys reuse the domain that is already recorded in .env.
if [ -z "$DOMAIN" ] && [ -f "$ENV_FILE" ]; then
    DOMAIN="$(sed -n 's#^CORS_ORIGINS=https\?://\([^,]*\).*#\1#p' "$ENV_FILE" | head -1)"
fi
DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
say "Deploying $DOMAIN on port $PORT"

# --------------------------------------------------------------------- env ---
if [ -f "$ENV_FILE" ]; then
    say "Keeping the existing $ENV_FILE"
else
    say "Writing $ENV_FILE"
    [ -n "${MONGO_URI:-}" ] || die "first run needs MONGO_URI=... (Atlas or mongodb://localhost:27017)"
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
    [ -n "$ADMIN_PASSWORD" ] || die "first run needs ADMIN_PASSWORD='...'"
    cat > "$ENV_FILE" <<ENVEOF
# ---------- MongoDB ----------
MONGO_URI=${MONGO_URI}
MONGO_DB=${MONGO_DB:-ai_pulse}

# ---------- Admin login ----------
ADMIN_USERNAME=${ADMIN_USERNAME:-ooa-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE_MINUTES=480

# ---------- App ----------
APP_NAME=AI Pulse
PORT=${PORT}
CORS_ORIGINS=https://${DOMAIN}
SERVE_FRONTEND=true
ENVEOF
fi
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------- frontend ---
say "Building the React app"
cd "$APP_DIR/frontend"
if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi
npm run build

# ----------------------------------------------------------------- backend ---
say "Installing Python dependencies"
cd "$APP_DIR/backend"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"

# ----------------------------------------------------------------- systemd ---
say "Installing the $SERVICE_NAME service (127.0.0.1:$PORT)"
sed -e "s#/var/www/ai-pulse#${APP_DIR}#g" \
    -e "s#127.0.0.1:8110#127.0.0.1:${PORT}#" \
    "$APP_DIR/deploy/ai-pulse.service" > "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

# ------------------------------------------------------------------- nginx ---
say "Configuring nginx for $DOMAIN"
SITE="/etc/nginx/sites-available/${SERVICE_NAME}"
mkdir -p /var/www/html

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    # No certificate yet — serve plain HTTP so certbot can complete HTTP-01.
    cat > "$SITE" <<NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
else
    sed -e "s/jain-studentpulse\.juooa\.cloud/${DOMAIN}/g" \
        -e "s#127.0.0.1:8110#127.0.0.1:${PORT}#g" \
        "$APP_DIR/deploy/nginx.conf" > "$SITE"
fi

ln -sf "$SITE" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ------------------------------------------------------------------ certbot --
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    say "Requesting a Let's Encrypt certificate for $DOMAIN"
    if ! apt install -y -qq certbot python3-certbot-nginx; then
        warn "could not install certbot — the site is up on plain HTTP. Retry with:
    apt-get -o DPkg::Lock::Timeout=600 install -y certbot python3-certbot-nginx
    certbot --nginx -d $DOMAIN --redirect"
    elif [ -n "$CERTBOT_EMAIL" ]; then
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect || \
            warn "certbot failed — check that $DOMAIN resolves to this server and port 80 is open, then re-run this script"
    else
        warn "CERTBOT_EMAIL not set — run manually:  certbot --nginx -d $DOMAIN --redirect"
    fi
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        sed -e "s/jain-studentpulse\.juooa\.cloud/${DOMAIN}/g" \
            -e "s#127.0.0.1:8110#127.0.0.1:${PORT}#g" \
            "$APP_DIR/deploy/nginx.conf" > "$SITE"
        nginx -t && systemctl reload nginx
    fi
fi

# ------------------------------------------------------------------- check ---
say "Health check"
sleep 2
if curl -fsS "http://127.0.0.1:${PORT}/api/health"; then
    echo
else
    warn "the app did not answer on 127.0.0.1:${PORT} — journalctl -u ${SERVICE_NAME} -n 50"
fi
systemctl --no-pager --lines=5 status "$SERVICE_NAME" || true

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    say "Done — https://${DOMAIN}  (survey /, admin /admin, docs /docs)"
else
    say "Done — http://${DOMAIN}  (no certificate yet; see the warnings above)"
fi
