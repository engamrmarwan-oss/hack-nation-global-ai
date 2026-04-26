# Architecture

> Owner: Codex + Claude
> Updated: 2026-04-25 19:47 CEST

## System Overview
Operon AI is a fresh Next.js full-stack application that turns a scientific question into a structured experiment plan. Its architecture borrows the strongest control-plane ideas from Crystal — staged generation, grounding, preview-before-apply, verification, and change governance — but repackages them for a scientific planning workflow rather than compliance management.

## Architecture Diagram
```text
Researcher
   |
   v
[Next.js UI + Server Routes]
   |
   v
[Intake + Question Profiler]
   |
   +-------------------------> [Tavily Retrieval]
   |                               |
   |                               v
   |                        [Evidence / Source Set]
   |                               |
   v                               |
[Experiment Planner Pipeline] <----+
   |
   +--> [Protocol Draft]
   +--> [Controls + Validation Checks]
   +--> [Materials + Sourcing Signals]
   +--> [Budget + Staffing Draft]
   |
   v
[Preview Review Layer]
   |
   +--> Apply as active experiment plan
   +--> Raise change proposals / revisions
   |
   v
[Prisma + SQLite MVP Store]
   |
   v
[Vercel Deployment Surface]
```

## Components

### 1. Next.js Application Shell
- **Purpose:** Host the user-facing workspace and the backend route handlers in one codebase for maximum hackathon speed.
- **Input:** Research questions, uploaded evidence, user review decisions.
- **Output:** Experiment plans, validation state, review actions.
- **Rationale:** This preserves Crystal's fast-iteration full-stack shape while avoiding premature distributed complexity.

### 2. Intake + Question Profiler
- **Purpose:** Normalize a scientific question into structured planning inputs: objective, constraints, assumptions, and likely experiment class.
- **Input:** Freeform scientific question and user context.
- **Output:** Planning-ready intake object.
- **Reuse Origin:** Guided intake and profiling patterns from Crystal.

### 3. Tavily Retrieval Layer
- **Purpose:** Retrieve live evidence for methods, protocol references, and sourcing context.
- **Input:** Structured retrieval queries derived from the research question.
- **Output:** Ranked evidence set with URLs, snippets, and retrieval metadata.
- **Why Tavily:** It is the cleanest sponsor fit for grounding the plan in real-world scientific and sourcing information.

### 4. Experiment Planner Pipeline
- **Purpose:** Convert the profiled question and evidence set into a lab-executable draft.
- **Input:** Intake object + evidence set.
- **Output:** Structured plan sections such as objective, protocol, controls, materials, budget, staffing, and risks.
- **Reuse Origin:** Crystal's staged background runner and contract-generation discipline.

### 5. Preview / Apply Layer
- **Purpose:** Separate generation from commitment so the user can review the plan before it becomes the active working version.
- **Input:** Generated draft sections and planner metadata.
- **Output:** Reviewable preview, apply action, or revision request.
- **Reuse Origin:** Crystal's preview-before-apply model.

### 6. Validation + Change Governance Layer
- **Purpose:** Keep updates explicit and traceable instead of silently mutating prior plans.
- **Input:** Revised plans, new evidence, user edits.
- **Output:** Change proposals, validation checks, supersession history.
- **Reuse Origin:** Crystal's verification and change-set model.

### 7. Persistence Layer
- **Purpose:** Store plans, evidence references, review state, and revisions for MVP.
- **Choice:** Prisma + SQLite in the initial build.
- **Trade-off:** Great for speed; not the final scale architecture.

### 8. Deployment Surface
- **Purpose:** Provide a stable public demo URL and fast iteration loop.
- **Choice:** Vercel.
- **Why Vercel:** Best fit for a polished judge-facing deployment of a Next.js product.

## Data Flow
1. User submits a scientific question.
2. The intake layer structures it into a planning object.
3. Tavily retrieves relevant methods, references, and sourcing context.
4. The planner generates a structured experiment draft with protocol, controls, materials, budget, and staffing.
5. The preview layer exposes the draft for review before activation.
6. Approved output becomes the active experiment plan.
7. Later updates generate reviewable changes rather than mutating history invisibly.

## Crystal-to-Operon AI Mapping
| Crystal Mechanism | Operon AI Role |
|-------------------|-----------------|
| Requirement formalization | Structured experiment / protocol spec |
| Requirement source references | Evidence references |
| Extraction preview | Draft plan preview |
| Verification state | Execution-readiness / validation state |
| Change sets | Plan revision and supersession log |
| Process structure | Experiment blueprint / phase structure |

## Key Technical Decisions
See [docs/decisions.md](docs/decisions.md) for full rationale.

| Decision | Choice | Why |
|----------|--------|-----|
| App shape | Next.js full-stack | Fastest route to a credible MVP |
| Retrieval | Tavily | Best sponsor fit and strong grounding utility |
| Deployment | Vercel | Fast, stable, public demo hosting |
| Initial storage | Prisma + SQLite | Fast local bootstrap for a 24-hour build |
| AI provider | OpenAI first, optional Ollama later | Lowest implementation risk now, privacy path later |
| Product framing | Science-native terminology | Avoids Crystal leakage and keeps the pitch crisp |

## Known Limitations (for MVP)
- Costing and sourcing will be directional rather than procurement-grade.
- Validation will focus on plausibility and completeness, not full scientific correctness.
- SQLite is a speed choice for the hackathon, not the long-term scale architecture.
- Some plan sections may start as best-effort drafts and require user refinement.

## What's NOT in MVP (but could be)
- Full lab scheduling and calendar coordination.
- Procurement workflow automation.
- LIMS / ELN integrations.
- Multi-agent autonomous execution loops.
- On-prem local-model deployment as the default runtime.
