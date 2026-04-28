# Deployment Handoff — Operon AI → Vercel + Neon

> Current status: **in progress** — SSL fix pushed, awaiting successful Vercel build.

---

## What Was Done

### Database
- Switched from local SQLite (`file:./dev.db`) to **Neon PostgreSQL** for production
- Neon project: `ep-young-smoke-aba8dnd4-pooler.eu-west-2.aws.neon.tech`
- Database name: `neondb`
- Neon Auth: **disabled** (NextAuth handles auth)
- Migrations: reset from SQLite → fresh PostgreSQL init migration (`prisma/migrations/`)
- Seed data: 6 experiments migrated from `dev.db` — all 6 live in Neon

### Prisma Config
- `prisma/schema.prisma`: provider changed from `sqlite` → `postgresql` (no `url` field — Prisma 7 reads URL from `prisma.config.ts`)
- `prisma.config.ts`: unchanged — reads `DATABASE_URL` from env
- `src/lib/db.ts`: switched from `PrismaLibSql` adapter → `PrismaPg` (pg Pool with SSL)
- `package.json` build script: `"build": "prisma generate && next build"` — ensures client is regenerated for postgresql on each Vercel build

### Vercel Environment Variables
| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_Q9HPoLpja1CJ@ep-young-smoke-aba8dnd4-pooler.eu-west-2.aws.neon.tech/neondb` |
| `ANTHROPIC_API_KEY` | (set — not shown) |
| `TAVILY_API_KEY` | (set — not shown) |
| `NEXTAUTH_SECRET` | (set — not shown) |
| `NEXTAUTH_URL` | (set to Vercel live URL — update after first successful deploy) |

> ⚠️ DATABASE_URL must NOT include `?sslmode=require&channel_binding=require` — Prisma 7 rejects those URL params. SSL is handled via `{ rejectUnauthorized: false }` in the pg Pool config in `src/lib/db.ts`.

---

## Current `src/lib/db.ts`

```ts
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

---

## Errors Encountered & Fixes

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `URL_PARAM_NOT_SUPPORTED: sslmode` | Prisma 7 rejects SSL params in URL | Remove `?sslmode=require&channel_binding=require` from DATABASE_URL |
| `URL_SCHEME_NOT_SUPPORTED: postgresql:` | App was using libSQL adapter which only accepts `libsql://` URLs | Replaced `PrismaLibSql` with `PrismaPg` adapter |
| `Expected 1 arguments, but got 0` | Prisma 7 requires an adapter passed to `PrismaClient()` | Pass `{ adapter }` to constructor |
| `not compatible with provider sqlite` | Generated Prisma client still compiled for SQLite | Added `prisma generate` to build script |
| `User was denied access on database (not available)` | Neon requires SSL but URL had no SSL params | Configure `ssl: { rejectUnauthorized: false }` in pg Pool |

---

## Next Steps for Claude Code

1. **Verify the latest Vercel build passes** — check GitHub Actions / Vercel dashboard for commit `fix: add SSL config to pg pool for Neon connection`
2. **Update `NEXTAUTH_URL`** in Vercel env vars to the confirmed live Vercel URL
3. **Run migrations on Neon if schema changes** — always use:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
4. **Never commit `seed_neon.mjs` or `seed_data.json`** to main — these are one-time migration artifacts. Add to `.gitignore` if needed.
5. **Local dev still uses SQLite** — `prisma.config.ts` defaults to `file:./dev.db` when `DATABASE_URL` is not set. Keep this — don't force local dev to use Neon.

---

## Repo
`github.com/engamrmarwan-oss/hack-nation-global-ai` — branch `main`

## Vercel Project
`hack-nation-global-ai` — auto-deploys on push to main
