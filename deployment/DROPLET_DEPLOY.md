# Temp Stitch Droplet Deployment

Temp Stitch runs as `tempstitch-app` on internal port `3000`. It joins the existing external `apps_proxy` network and does not publish a host port. The central `apps-caddy` container remains the only public reverse proxy.

## 1. Prepare the application

Place this repository at `/opt/apps/tempstitch`, then create its environment file:

```bash
mkdir -p /opt/apps/tempstitch
cd /opt/apps/tempstitch
cp .env.example .env
chmod 600 .env
```

Leave both Supabase variables blank for browser-local mode. To enable Supabase, set both values before building because `NEXT_PUBLIC_*` values are embedded in the browser bundle.

## 2. Validate and start Temp Stitch

```bash
cd /opt/apps/tempstitch
docker network inspect apps_proxy >/dev/null
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker logs --tail 100 tempstitch-app
```

Confirm the app is reachable only through the shared network:

```bash
docker run --rm --network apps_proxy alpine sh -c '
  apk add --no-cache curl >/dev/null
  curl --fail --silent --show-error --head http://tempstitch-app:3000/login
'
```

## 3. Add the central Caddy route

Back up the active file before editing it:

```bash
cp /opt/apps/proxy/Caddyfile "/opt/apps/proxy/Caddyfile.backup.$(date +%Y%m%d-%H%M%S)"
```

Append this as a new top-level site block in `/opt/apps/proxy/Caddyfile`:

```caddy
tempstitch.jays-apps.com {
    encode gzip zstd
    reverse_proxy tempstitch-app:3000
}
```

Validate the exact mounted Caddyfile before restarting the proxy:

```bash
docker run --rm \
  -v /opt/apps/proxy/Caddyfile:/etc/caddy/Caddyfile:ro \
  caddy:2-alpine \
  caddy validate --config /etc/caddy/Caddyfile
```

Only after validation succeeds:

```bash
cd /opt/apps/proxy
docker compose restart caddy
```

## 4. Production verification

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker inspect tempstitch-app --format '{{json .NetworkSettings.Networks}}'
docker logs --tail 100 tempstitch-app
docker logs --tail 100 apps-caddy
curl --fail --silent --show-error --head https://tempstitch.jays-apps.com
curl --fail --silent --show-error --head https://gospellight.jays-apps.com
curl --fail --silent --show-error --head https://duramark.jays-apps.com
```

Expected: `tempstitch-app` shows only `3000/tcp`, belongs to `apps_proxy`, and the three public URLs return successful HTTP responses. Only `apps-caddy` should publish host ports `80` and `443`.

## Operations

Start or rebuild:

```bash
cd /opt/apps/tempstitch
docker compose up -d --build
```

Restart only Temp Stitch:

```bash
docker restart tempstitch-app
```

View or follow logs:

```bash
docker logs --tail 100 tempstitch-app
docker logs -f tempstitch-app
```

Validate configuration and health:

```bash
cd /opt/apps/tempstitch
docker compose config
docker compose ps
docker inspect tempstitch-app --format '{{json .State.Health}}'
```
