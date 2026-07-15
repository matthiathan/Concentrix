# Retro UI Review

This branch applies a presentation-only retro control-room theme to the Concentrix Coffee Operations application.

## Branches

- `main`: production application and current design
- `checkpoint-pre-retro-ui`: immutable rollback checkpoint before the retro redesign
- `retro-ui-superdesign`: retro redesign working branch

## Design direction

- CRT scanline treatment
- IBM Plex Mono interface typography
- Pixel-display headings
- High-contrast phosphor green, amber, cream and signal-red palette
- Square industrial controls and hard-offset shadows
- Terminal-style authentication and import workflows
- Retro status chips, tables and operational panels
- Responsive mobile behavior retained
- Reduced-motion support retained

## Functional scope

No Supabase queries, authentication behavior, RLS policies, imports, machine scanning, task logic, reports or operational workflows were changed. The redesign is loaded through `src/retro-theme.css` after the existing stylesheets.

## Review

Deploy this branch as a separate Render preview. To return to the previous design, deploy `main` or `checkpoint-pre-retro-ui`.