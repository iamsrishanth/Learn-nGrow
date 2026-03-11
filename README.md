# Learn-nGrow Baseline

This repository contains a baseline monorepo scaffold for a Next.js (TypeScript) application using the App Router.

## Project structure

- `apps/web`: Next.js application.
  - `apps/web/app/(auth)`: auth route group for login/signup pages.
  - `apps/web/app/dashboard`: dashboard route.
  - `apps/web/app/diagnostics`: diagnostics flow route.
  - `apps/web/app/recommendations`: recommendations route.
  - `apps/web/app/admin`: admin route.
- `packages/ui`: shared UI components.
- `packages/lib`: shared library exports.
- `packages/types`: shared TypeScript types.
- `lib/supabase`: Supabase integration helpers.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your local env file:
   ```bash
   cp .env.example .env.local
   ```
3. Start the web app:
   ```bash
   npm run dev:web
   ```

## Environment variables

Template values are provided in `.env.example` for:

- Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Gemini (`GEMINI_API_KEY`)
- App URLs (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`)

## Architecture overview

- **App Router + route groups** for feature boundaries and URL design.
- **Shared workspace packages** for reusable UI, logic, and types.
- **Dedicated `lib/supabase` anchor** to centralize backend configuration.
