# Temperature Blanket Workspace

A parallel mobile + web workspace for planning, previewing, and building temperature blankets.

## Workspace layout

- `apps/mobile`
  Existing Expo + React Native app, preserved as the mobile experience.
- `apps/web`
  New Next.js web app with a responsive desktop/tablet-first shell.
- `packages/core`
  Shared domain types, weather services, yarn recommendation logic, temperature mapping, demo data, and serialization helpers.

## What is implemented

- Workspace/monorepo structure with shared `core` package
- Existing mobile app moved into `apps/mobile`
- New web app scaffold in `apps/web`
- Shared weather, yarn, temperature, date, project, and persistence logic extracted into `packages/core`
- Web auth provider with Supabase-aware magic-link flow and demo fallback mode
- Web theme provider with `light`, `dark`, and `system`
- Web app data provider reusing the current project/weather/range/progress orchestration
- Web routes for:
  - `/app/projects`
  - `/app/projects/new`
  - `/app/projects/[id]/colors`
  - `/app/projects/[id]/preview`
  - `/app/projects/[id]/build`
  - `/app/projects/[id]/settings`
  - `/login`
- Supabase schema scaffold for normalized cloud persistence in `apps/web/supabase/schema.sql`

## Run locally

1. Install workspace dependencies:

```bash
npm install
```

2. Start the mobile app:

```bash
npm run dev:mobile
```

3. Start the web app:

```bash
npm run dev:web
```

4. Run all typechecks:

```bash
npm run typecheck
```

## Web environment

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If these are missing, the web app falls back to demo/local mode so the UI still runs.

## Persistence model

### Mobile

- Mobile still uses local persistence through AsyncStorage.
- Google Play donation purchases remain mobile-only.

### Web

- Web uses a browser storage adapter when Supabase is not configured.
- Web is prepared for a Supabase-backed normalized schema using:
  - `projects`
  - `temperature_ranges`
  - `temperature_days`
  - `build_progress_rows`
  - `weather_cache`

## Current web scope

The web app already has a working shell and shared-data flow, but it is still an MVP transition layer rather than a full parity rebuild. The key blanket flows are represented in the route structure and data provider, with room for deeper UX polish and broader editing behavior in later passes.

## Notes

- The mobile app remains supported and compile-checked in the workspace.
- The web app intentionally does not carry over Google Play donations.
- Shared logic in `packages/core` is now standalone and no longer coupled to the old app-local alias structure.

## Production deployment

The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml` for the existing Jay's Apps Droplet. The container is named `tempstitch-app`, listens on `0.0.0.0:3000`, joins the external `apps_proxy` network, and publishes no host ports.

See `deployment/DROPLET_DEPLOY.md` for the ordered deployment, central Caddy validation, rollback-safe proxy update, log, and health-check commands.
