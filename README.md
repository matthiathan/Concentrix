# Concentrix Smart Coffee & Site Operations

A React + TypeScript + Supabase operational web application for Concentrix employee coffee benefits, security-card management, Nayax machine telemetry, field service, QR task closure, downtime alerts and SLA reporting.

## Current build

- Responsive operations dashboard
- Supplied pendulum loading screen
- Machine health and uptime overview
- Card and benefit metrics
- SLA task list and incident indicators
- Integration health panel
- Supabase PostgreSQL migration
- Environment template

## Stack

- Vite
- React 18
- TypeScript
- Lucide React
- Supabase/PostgreSQL

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Supabase project URL and publishable key to `.env.local`.

## Database

Run `supabase/migrations/202607130001_initial_schema.sql` in a clean Supabase project. Test all RLS policies with non-service-role users before production.

## Integration boundaries

Nayax, Concentrix HR and access-control credentials must only be used from server-side Edge Functions. Never expose secret or service-role keys in the browser.

## Roadmap

1. Authentication and role-aware routing
2. Employees, cards and benefits CRUD
3. Nayax event ingestion Edge Function
4. Machine and task management
5. QR verification workflow
6. SLA and downtime processing
7. Concentrix client-safe dashboard
8. Power BI semantic model
