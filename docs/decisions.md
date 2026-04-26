# Decision Log

> Owner: All AI agents — log every significant decision here immediately.
> Format: newest first.

---

## Decisions

### [2026-04-25 21:32] — Restore Prisma as the normal local database workflow
**Decision:** Replace the raw-SQL bootstrap path with a Prisma-first `db:init` flow that baselines an existing `dev.db` into migration history and applies checked-in migrations to fresh databases.
**Rationale:** The live SQLite schema and `schema.prisma` already matched, but the checked-in initial migration had drifted and the existing local database was outside Prisma migration history. Restoring the migration path was the safest way to enable further schema work without resetting hackathon data.
**Trade-offs accepted:** `db:init` now performs environment-aware detection logic instead of being a tiny one-shot script, and older preview / plan rows keep empty timeline data until regenerated.
**Made by:** Codex

### [2026-04-25 21:32] — Add timeline as a first-class experiment plan section
**Decision:** Add `timelineJson` to `PlanPreview` and `ExperimentPlan`, generate phased timeline content in the planner, and render the timeline in both the draft preview and active plan views.
**Rationale:** The AI Scientist brief explicitly requires a phased timeline with dependencies, and this was one of the highest-signal remaining gaps that depended on working Prisma migrations.
**Trade-offs accepted:** Existing records default to an empty timeline until a fresh preview is generated, and the first implementation is still heuristic rather than LLM-authored.
**Made by:** Codex

### [2026-04-25 19:47] — Use Tavily as the retrieval sponsor integration
**Decision:** Tavily is the primary sponsor integration for scientific evidence retrieval and sourcing context.
**Rationale:** The challenge reward comes from producing credible experiment plans, and Tavily directly strengthens grounding, references, and operational realism.
**Trade-offs accepted:** Tavily adds an external dependency and some retrieval-shaping work that generic search-free planning would avoid.
**Made by:** You + Codex

### [2026-04-25 19:47] — Use Vercel as the deployment sponsor integration
**Decision:** Vercel is the primary deployment target for the hackathon demo.
**Rationale:** We need a polished public URL quickly, and the planned app shape is already a strong fit for Vercel's Next.js deployment path.
**Trade-offs accepted:** We optimize for demo speed rather than maximum infrastructure flexibility in MVP.
**Made by:** You + Codex

### [2026-04-25 19:47] — Rebuild fresh instead of publicly forking Crystal
**Decision:** The new repo stays challenge-native with fresh docs, naming, and history, while reusing Crystal's architectural mechanisms.
**Rationale:** This keeps the build current and credible for the hackathon without discarding the proven design work already done.
**Trade-offs accepted:** We spend time renaming and reframing instead of directly copying the entire product.
**Made by:** You + Codex

### [2026-04-25 19:47] — Keep Crystal as the private architecture source snapshot
**Decision:** Use the latest local Crystal working tree as the source of reusable mechanisms, including uncommitted local updates.
**Rationale:** The current working tree contains fresher logic than the last commit and gives us the most up-to-date control-plane foundation.
**Trade-offs accepted:** Migration requires deliberate filtering so stale branding and unrelated assets do not leak into the new repo.
**Made by:** You + Codex

### [2026-04-25 19:47] — Keep the MVP as a Next.js full-stack application
**Decision:** Operon AI will start as a consolidated Next.js app with server routes, not a microservices system.
**Rationale:** This is the fastest path to a working demo and matches the strongest existing structural pattern from Crystal.
**Trade-offs accepted:** Async execution and scale isolation stay intentionally lightweight for the MVP.
**Made by:** You + Codex

## Out-of-Scope (parking lot)
- Full procurement automation — too much integration surface for the hackathon window
- Lab-grade scheduling and resource booking — valuable later, not needed for first win condition
- General-purpose scientific chatbot — weaker differentiation than grounded experiment planning
