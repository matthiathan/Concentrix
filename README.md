# Concentrix Smart Coffee & Site Operations

A React, TypeScript and Supabase operations platform for Concentrix employee coffee benefits, access cards, Nayax transactions, machine telemetry, incidents and field service.

## Production status

The `main` branch is the Render production branch. The application is connected to the **concentrix** Supabase project (`sugqeyuqzimxaswmuayr`) through the browser-safe publishable key. Supabase Auth and Row Level Security remain the authorization boundary.

## Implemented features

- Secure email/password authentication
- Automatic platform-admin assignment for the designated initial administrator
- In-app password changes
- Live dashboard with polling and Realtime updates
- Employees list, create, employment-status management and benefit eligibility
- Access-card list, secure client-side UID hashing, create and status management
- Sites list, create and activation management
- Machines list, create, site assignment and lifecycle-status management
- Service-task list, create and workflow-status management
- Incidents list, create, severity display and status management
- Global page search and CSV export
- Nayax transaction reporting and financial summaries
- Open-incident notification panel
- QR camera scanning where supported, with manual asset/serial lookup fallback
- Responsive desktop and mobile layouts
- Empty and permission-error states
- Render static-site configuration and SPA rewrite
- GitHub Actions production build workflow

## Live Supabase tables

The frontend reads or writes, subject to RLS:

- `employees`
- `access_cards`
- `sites`
- `machines`
- `service_tasks`
- `incidents`
- `nayax_transactions`
- `task_sla_clocks`
- `integration_connections`
- `organization_memberships`

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Required environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Production build

```bash
npm ci
npm run build
```

Render uses `render.yaml` with:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA rewrite: `/* -> /index.html`

## Security boundaries

Nayax, Concentrix HR and access-control credentials must only be used from server-side Supabase Edge Functions. Never expose service-role keys or third-party secrets in the browser.

Card UIDs are never stored as plaintext by the frontend. They are SHA-256 hashed before insertion, while only the supplied masked identifier is displayed.

## External integrations still requiring credentials

The application surfaces integration health and consumes imported live data, but these server-side connectors require external credentials and contracts before they can be activated:

1. Nayax device, card and transaction ingestion
2. Concentrix HR joiner/mover/leaver synchronisation
3. Physical access-control card synchronisation
4. Power BI publishing and workspace configuration

These integrations must be implemented as Supabase Edge Functions or other secure server-side services, not in the Vite browser bundle.
