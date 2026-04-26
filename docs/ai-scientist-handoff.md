# AI Scientist Project Handoff

Last updated: 2026-04-26 00:18 CEST

## Project Identity
- Working product name: `Operon AI`
- Repo: `/Users/amrmarwan/Downloads/hack-nation-global-ai`
- Challenge: Hack-Nation Global AI Hackathon, AI Scientist brief
- Core promise: turn a scientific question into a grounded, lab-executable experiment plan with evidence, controls, materials, budget, staffing, risks, and a reviewable preview-before-apply flow

## What This Handoff Is
This handoff is only for the AI Scientist project. It intentionally excludes Crystal’s broader compliance product context except where Crystal mechanisms were reused structurally.

## Current State
Operon AI now has a staged pipeline MVP:
- persisted experiment creation
- Claude-based question profiling, plan generation, and critic review
- literature QC via Semantic Scholar plus Tavily-backed evidence retrieval
- persisted `PlanningRun` records with stage tracking
- multi-surface workflow: dashboard, new experiment, live pipeline, full plan
- legacy preview compatibility for older saved records

This is beyond scaffolding. The current app supports real saved experiments, staged runs, blocked-vs-ready review states, and legacy record rendering.

## Implemented Product Flow
1. User creates a new experiment from `/experiments/new`.
2. Operon AI stores it as a `ResearchQuestion`.
3. Operon AI starts a persisted `PlanningRun`.
4. The pipeline runs in order:
   - question profiling
   - literature QC
   - evidence retrieval
   - draft generation
   - critic validation
5. Operon AI persists the resulting `PlanPreview`, critic result, and stage metadata.
6. The user reviews the draft through the pipeline and full-plan surfaces.
7. Blocked drafts remain viewable but should not be applied.
8. Legacy previews created before the pipeline remain readable through the normalized plan serializer.

## Implemented Data Model
Source of truth:
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/prisma/schema.prisma`

Current models:
- `Project`
- `ResearchQuestion`
- `EvidenceSource`
- `PlanPreview`
- `ExperimentPlan`
- `PlanningRun`

Important design choices:
- preview and active plan are separate objects
- literature QC runs before generation
- critic validation runs after generation
- blocked drafts remain viewable but are apply-gated
- planning runs are the workflow spine for persisted stage tracking
- legacy previews are normalized into the current `ExperimentPlan` rendering shape

## Key Files
### App shell
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/page.tsx`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/layout.tsx`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/globals.css`

### Workflow UI
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/experiments/new/page.tsx`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/experiments/[id]/pipeline/page.tsx`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/experiments/[id]/plan/page.tsx`

### API routes
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/api/experiments/route.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/api/experiments/[id]/route.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/app/api/pipeline/route.ts`

### Core logic
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/db.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/experiment-data.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/structured-output.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/workflow-types.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/tavily.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/agents/orchestrator.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/agents/literature-qc.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/agents/planner.ts`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/src/lib/agents/critic.ts`

### Project docs
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/README.md`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/context.md`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/architecture.md`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/decisions.md`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/challenge-notes.md`
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/migration-context.md`

## Environment Setup
Local env file:
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/.env.local`

Expected values:
- `DATABASE_URL="file:./dev.db"`
- `ANTHROPIC_API_KEY="..."`
- `ANTHROPIC_MODEL="claude-sonnet-4-5"`
- `TAVILY_API_KEY="..."`
- `NEXTAUTH_SECRET="dev-secret"`
- `NEXTAUTH_URL="http://localhost:3000"`

Important:
- Tavily is configured and has already been used successfully in local testing
- Claude is the active planning stack for orchestrator, planner, and critic
- Semantic Scholar is used without auth for literature QC support

## Verified Working Behavior
Verified locally in this repo:
- `npm install`
- Prisma client generation
- local DB bootstrap / baseline
- `npm run lint`
- `npm run build`
- `npm run db:migrate`
- app runtime smoke test
- live experiment listing and detail APIs
- pipeline_v2 detail payloads for failed and blocked runs
- legacy preview normalization through `/api/experiments/[id]`

Behavior confirmed:
- the app can save experiments
- the app can persist pipeline runs and stage transitions
- failed runs expose persisted `runError`
- blocked runs expose `reviewStatus: "blocked"` and `applyBlocked: true`
- legacy completed records render as `workflowVersion: "legacy_preview"` instead of breaking the plan page

## Infrastructure Update
Prisma is back on the normal workflow in the current repo state.

What was fixed:
- the checked-in initial migration now matches the real SQLite schema
- the existing local `dev.db` has been safely baselined into Prisma migration history
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/scripts/init-db.mjs` now uses Prisma commands instead of raw table-creation SQL

Verified locally on 2026-04-25:
- `prisma generate`
- `prisma migrate status`
- `prisma migrate dev`
- `npm run db:init`

Current meaning:
- future schema changes should go through normal Prisma migrations
- `db:init` is now a safe bootstrap / baseline helper, not a raw SQL fallback
- the previous Node-25 warning from earlier in the day is stale for the current repo state

## Recommended Next Build Steps
### Priority 1
Add apply flow from pipeline_v2 review-ready drafts into the active `ExperimentPlan` lifecycle.

### Priority 2
Improve planner reliability further with a richer repair path or structured-output constraints that reduce truncation risk on long plans.

### Priority 3
Strengthen run provenance and compare surfaces:
- richer stage output inspection
- better active-vs-draft comparison
- clearer apply gating in the plan UI

### Priority 4
Polish the judge-facing UX:
- clearer evidence-to-plan traceability
- stronger blocked vs ready visual differentiation
- optional export / presentation surface if time allows

## Architectural Reuse From Crystal
These ideas were intentionally reused from Crystal:
- preview before apply
- grounding / provenance discipline
- staged orchestration thinking
- explicit promotion into active state
- change-friendly plan lifecycle

These were intentionally not carried over as public framing:
- compliance terminology
- release-readiness workflow
- process-map-first framing
- regulatory framework vocabulary

Operon AI should continue to feel like a science-native product, not a rebranded Crystal.

## Current Limitations
- planner output can still fail on malformed or truncated model JSON
- apply-to-active-plan is not yet wired into the new pipeline_v2 surfaces
- no procurement-grade costing
- no deep lab scheduling
- no LIMS / ELN integration
- compare/revise flow is still lighter than a full Crystal-style review workspace

## Local Commands
Run from:
- `/Users/amrmarwan/Downloads/hack-nation-global-ai`

Useful commands:
- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:init`
- `npm run db:migrate`
- `npm run db:deploy`

Note:
- `db:init` safely baselines an existing local database or applies checked-in migrations to a fresh one

## Existing Local Data
Local SQLite data exists and should be preserved unless intentionally reset:
- `/Users/amrmarwan/Downloads/hack-nation-global-ai/dev.db`

It already contains:
- the default Operon AI workspace
- at least one saved research question
- retrieved evidence
- preview records
- an active plan and a newer replacement draft state

Do not casually delete this local data if continuing from the current workspace.

## Suggested Fresh-Project Starter Prompt
If this work is being moved into a new project thread, start with this:

> We are continuing the AI Scientist hackathon project only. The active repo is `/Users/amrmarwan/Downloads/hack-nation-global-ai`, product name `Operon AI`. The current MVP already supports scientific-question intake, Tavily-backed evidence retrieval, grounded preview generation, and explicit apply-to-active-plan promotion. Please read `/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/ai-scientist-handoff.md` first, then continue from the repo’s real current state rather than re-planning from scratch.
