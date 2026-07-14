# Concentrix Smart Coffee & Site Operations

A React + TypeScript operational web application for Concentrix employee coffee benefits, security-card management, Nayax telemetry, field service, QR task closure, downtime alerts and SLA reporting.

## Live Supabase connection

The application is connected to the **concentrix** Supabase project:

- Project reference: `sugqeyuqzimxaswmuayr`
- API URL: `https://sugqeyuqzimxaswmuayr.supabase.co`
- Browser access uses the project publishable key only.
- Secret and service-role keys must never be added to this repository or exposed to the browser.

The dashboard now reads live data from:

- `machines`
- `sites`
- `service_tasks`
- `incidents`
- `access_cards`
- `employees`
- `nayax_transactions`
- `task_sla_clocks`
- `integration_connections`

It refreshes every 30 seconds and also subscribes to Realtime changes for machines, tasks, incidents and Nayax transactions.

## Authentication and RLS

Users must sign in through Supabase Auth. Database access is then controlled by `organization_memberships` and Row Level Security.

There are currently no Auth users or operational records in the project. Before the dashboard can be used:

1. Create the first user in **Supabase Dashboard → Authentication → Users**.
2. Copy that user's UUID.
3. Assign the user to the Dallmayr organisation by running:

```sql
insert into public.organization_memberships (
  organization_id,
  user_id,
  role
)
select
  id,
  'REPLACE_WITH_AUTH_USER_UUID'::uuid,
  'platform_admin'::public.app_role
from public.organizations
where code = 'DALLMAYR-ZA';
```

Use a narrower role for normal users. Do not make all users platform administrators.

## Current build

- Secure Supabase email/password sign-in
- Live operations dashboard
- Supplied pendulum loading screen
- Machine health and availability
- Card and employee-benefit metrics
- Live Nayax benefit transaction totals
- SLA task and incident indicators
- Integration health panel
- Automatic polling and Realtime refresh
- Responsive desktop and mobile interface
- Empty states when operational data has not yet been imported

## Stack

- Vite
- React 18
- TypeScript
- Supabase JavaScript client
- Supabase Auth, PostgreSQL, RLS and Realtime
- Lucide React

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The committed `.env.example` contains the public Concentrix Supabase URL and publishable key. These values are safe for browser use because RLS remains the authorization boundary.

## Production build

```bash
npm run build
```

A GitHub Actions workflow also runs the production build on pushes and pull requests to `main`.

## Integration boundaries

Nayax, Concentrix HR and access-control credentials must only be used from server-side Supabase Edge Functions. Never expose API secrets or the Supabase service-role key in frontend code.

## Data status

The database schema is installed, but the operational tables are currently empty. Until employee, card, machine, task and Nayax data is imported, the live dashboard will correctly display zero values and empty-state messages rather than sample information.

## Next implementation stages

1. Create initial authorised users and role memberships.
2. Import Concentrix sites, employees and card mappings.
3. Configure Nayax device and transaction ingestion.
4. Configure HR joiner, mover and leaver synchronisation.
5. Build CRUD pages for employees, cards, machines and tasks.
6. Complete QR verification and task-closing workflows.
7. Add client-safe Power BI reporting.
