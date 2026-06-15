# Prisma and Vercel notes for Family Sync Peek

## Purpose

This document is a short integration reference for using Prisma with Neon on Vercel during the Family Sync Peek MVP sprint. It exists because Prisma connection handling in serverless environments needs a few explicit setup choices to avoid connection pool problems and deployment confusion.

## Decision summary

Prisma will be used as the ORM, Neon will be the Postgres host, and Vercel will host the Next.js app. For this stack, the important rule is to use Neon’s pooled connection path for normal app runtime traffic and keep a direct connection path available for migrations or administrative Prisma commands.

## Why this matters on Vercel

Vercel runs backend code in serverless functions, and Prisma can open too many database connections if serverless traffic is not paired with the right connection-pooling setup. This is the main reason teams see pool timeout issues or `P2024`-style failures after deployment rather than during simple local development.

## Core setup rule

Use two database URLs:

- `DATABASE_URL`: the **pooled** Neon connection string for normal app runtime.
- `DIRECT_URL`: the **direct** Neon connection string for Prisma migrations, seeding, and other administrative tasks when needed.

This split is the key Prisma/Neon/Vercel setup decision for the MVP.

## Recommended environment variables

Add these environment variables locally and in Vercel:

- `DATABASE_URL`
- `DIRECT_URL`

Optional app-level variables depending on the project setup:

- `NODE_ENV`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Only the first two are Prisma/Neon specific. The rest are part of the surrounding app stack.

## Suggested connection-string approach

For the MVP, start with Neon’s pooled connection string in `DATABASE_URL` and the direct connection string in `DIRECT_URL`. In serverless contexts, Prisma guidance commonly starts conservatively with a low connection limit such as `connection_limit=1`, because many short-lived functions can otherwise multiply connections quickly.

A practical starting point is to append parameters like:

```text
?connection_limit=1&pool_timeout=20
```

Use this as a starting point, not as a magic universal setting. If the app behaves well locally and in deployment, keep the setup simple; tune only if real timeout behavior appears.

## Prisma schema datasource pattern

Typical Prisma datasource shape:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

This makes it explicit that app queries and direct administrative tasks may use different paths.

## Runtime guidance

For this project, Prisma should stay on the standard Node.js server runtime path during the sprint. Edge-specific runtime support is a separate concern and should not be mixed into the demo-week build unless there is a strong reason to do so.

Practical implication:

- Use Prisma in server actions, route handlers, or server-side modules that run in Node.
- Avoid introducing Edge runtime complexity while the main goal is a stable demo.

## Basic install and setup steps

### 1. Install Prisma

- Install `prisma` as a dev dependency.
- Install `@prisma/client` as a runtime dependency.

### 2. Initialize Prisma

- Run Prisma init.
- Set provider to PostgreSQL.
- Add `url` and `directUrl` environment references in the datasource.

### 3. Add Neon URLs

- Put the pooled Neon URL in `DATABASE_URL`.
- Put the direct Neon URL in `DIRECT_URL`.

### 4. Create the schema

- Add Auth.js-related models.
- Add app models such as `FamilyGroup`, `GroupMembership`, `CalendarConnection`, `VisibilitySetting`, and `SharedNote`.

### 5. Run migration

- Create the first migration.
- Apply it locally.
- Confirm that the tables exist and Prisma can query them.

### 6. Deploy to Vercel

- Add `DATABASE_URL` and `DIRECT_URL` to the Vercel project environment variables.
- Redeploy.
- Verify the deployed app can perform a simple DB read/write without errors.

## Prisma client usage reminder

Use one shared Prisma client module in the app rather than scattering new Prisma client instances everywhere. This is a common organizational best practice in Next.js apps because it reduces confusion and makes DB access easier to reason about, especially during debugging. The demo-week goal is to keep DB access centralized and predictable.

A typical project pattern is a single `lib/prisma.ts` or similar module that exports the app’s Prisma client instance.

## Smoke tests for setup

Run these as soon as the DB is wired:

### Local smoke tests

- Prisma migration succeeds.
- Prisma Studio or a simple script can read the database.
- App can create a user/group record locally.
- App can load a saved record locally.

### Deployment smoke tests

- Deployed app loads without DB connection error.
- A protected page can read session-linked user data.
- Group creation writes to the database successfully.
- Shared note save/load works in deployment.

### Failure signals to watch for

- `P2024` or pool timeout style errors.
- Migration succeeds locally but deployed runtime cannot connect.
- App works in one route but fails intermittently under repeated refreshes or repeated API calls.

## Troubleshooting checklist

If DB access fails after deployment:

1. Confirm `DATABASE_URL` is the pooled Neon URL.
2. Confirm `DIRECT_URL` is the direct Neon URL.
3. Confirm Vercel environment variables are set in the correct environment.
4. Confirm the Prisma datasource references the correct env vars.
5. Confirm the app is not trying to run Prisma in an Edge-only path.
6. Confirm the schema has been migrated to the deployed database.
7. If needed, start with `connection_limit=1` and retest.

## What not to do during the sprint

- Do not introduce Prisma Accelerate unless the basic Neon pooled setup actually fails for your use case.
- Do not over-tune connection parameters before a real problem appears.
- Do not mix preview-env debugging, auth issues, and DB issues all at once; isolate one layer at a time.
- Do not expand into Edge-runtime Prisma experiments during demo week.

## Demo-week recommendation

For the one-week sprint, keep the Prisma/Vercel setup boring and stable:

- Neon pooled URL for runtime.
- Neon direct URL for migrations.
- Standard Node runtime.
- One shared Prisma client module.
- Small schema.
- Early smoke tests after deployment.

That is the most realistic path to a working demo with this stack.