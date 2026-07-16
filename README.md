# Temp Stitch Web Workspace

A responsive web application for planning, previewing, and building temperature blankets.

## Workspace layout

- `apps/web`
  Next.js web app with responsive phone, tablet, and desktop layouts.
- `packages/core`
  Shared domain types, weather services, yarn recommendation logic, temperature mapping, demo data, and serialization helpers.

## What is implemented

- Workspace/monorepo structure with shared `core` package
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

## Web feature parity

The responsive web app now includes the complete crafting workflow from mobile:

- Six-step create/edit wizard with weather preview, draft recovery, yarn preferences, and safe regeneration warnings
- Controlled color-range editor with normalization, gap/overlap validation, drag reorder, auto-generated bands, and yarn alternates
- Full blanket, row-detail, and yearly heatmap previews with texture, zoom, month markers, stats, and palette usage
- Queue and Focus build modes with next-five rows, completed history, sticky completion, persistent progress, and undo
- Import/export, weather re-sync, duplicate, archive/restore, reset, delete confirmations, and theme controls
- Two seeded demo projects on first use; subsequent projects persist in versioned browser local storage

Google Play support purchases remain mobile-only. Supabase authentication and cross-device sync remain prepared but disabled for the current web release.

## Run locally

1. Install workspace dependencies:

```bash
npm install
```

2. Start the web app:

```bash
npm run dev:web
```

3. Run all typechecks:

```bash
npm run typecheck
```

4. Run the web regression tests:

```bash
npm run test --workspace @temperature-blanket/web
```

## Web environment

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If these are missing, the web app falls back to demo/local mode so the UI still runs.

## Persistence model

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

- The retired Expo source may be retained locally under `_local-backups/mobile-app`, which is excluded from Git and Docker builds.
- Google Play donations are not part of the web app.
- Shared logic in `packages/core` is now standalone and no longer coupled to the old app-local alias structure.

## Production deployment

The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml` for the existing Jay's Apps Droplet. The container is named `tempstitch-app`, listens on `0.0.0.0:3000`, joins the external `apps_proxy` network, and publishes no host ports.

See `deployment/DROPLET_DEPLOY.md` for the ordered deployment, central Caddy validation, rollback-safe proxy update, log, and health-check commands.
