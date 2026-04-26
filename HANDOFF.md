# AI Scientist — Claude Code Handoff
**Date:** 2026-04-25  
**Project:** Hack-Nation × World Bank Youth Summit — Challenge 04: The AI Scientist  
**Sponsor:** Fulcrum Science  
**Location:** `/Users/amrmarwan/Downloads/hack-nation-global-ai`

---

## Mission

Transform a natural language scientific hypothesis into a **complete, operationally executable experiment plan** — one that a real lab could pick up on Monday and start running by Friday.

**Quality bar (non-negotiable):** Would a real scientist trust this plan enough to order the materials and start running it? That is the only standard that matters.

---

## What You Are Doing

This is a **surgical rewrite** of an existing Next.js app (now Operon AI). The DB schema, Tavily client, and type definitions are solid — everything else is being replaced with a clean **4-page Crystal-like architecture**: one page per purpose, one job per page, clean linear progression through the workflow.

### Keep These Files (do not modify)
- `prisma/schema.prisma` + `prisma/migrations/` + `dev.db`
- `src/lib/db.ts`
- `src/lib/tavily.ts`
- `src/lib/workflow-types.ts`
- `package.json` (but add `@anthropic-ai/sdk`)
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- `.env.local` (ANTHROPIC_API_KEY and TAVILY_API_KEY are set)
- `prisma.config.ts`

### Delete Everything Else in src/
- `src/lib/planner.ts` — pure template string interpolation, no LLM
- `src/lib/workflow.ts` — multi-step manual flow, broken
- `src/lib/workflow-engine.ts` — template-based agents, no LLM
- `src/lib/workspace.ts`, `workspace-data.ts`, `workspace-response.ts`, `view-models.ts`
- All `src/app/` routes and pages (multi-page routing — throw it out)
- All `src/components/` (disconnected from current routing)

---

## Install First

```bash
cd /Users/amrmarwan/Downloads/hack-nation-global-ai
npm install @anthropic-ai/sdk
```

---

## Architecture: Four-Page Crystal Pipeline

```
Page 1 — Dashboard (/)
  Past experiments list + status badges
  [Start New Experiment] CTA
              ↓
Page 2 — New Experiment (/experiments/new)
  Hypothesis textarea + inline validation hints
  [Run Analysis] button
              ↓
    /api/pipeline  (SSE stream)
              ↓
┌─────────────────────────────────┐
│  ① Orchestrator Agent (Claude)  │ → QuestionProfile JSON
│  ② Literature QC Agent          │ → NoveltySignal + refs[1–3]
│  ③ Planner Agent (Claude LLM)   │ → ExperimentPlan JSON
│  ④ Critic Agent (Claude LLM)    │ → CriticSummary JSON
└─────────────────────────────────┘
              ↓
Page 3 — Pipeline (/experiments/[id]/pipeline)
  Live 4-stage progress strip (SSE-driven)
  QC result revealed after Stage 2 — BEFORE plan CTA
  [Open Full Plan] CTA revealed after Stage 4
              ↓
Page 4 — Plan (/experiments/[id]/plan)
  Pinned header + tabbed plan
  Protocol | Materials | Budget | Timeline | Validation | Sources
```

**Key constraint:** Literature QC result is always shown before the plan is revealed. The judge must see the novelty signal first. No shortcuts on Orchestrator — it uses Claude, same as Planner and Critic.

---

## File Structure to Build

```
src/
  app/
    page.tsx                        <- PAGE 1: Dashboard — past experiments list + New Experiment CTA
    layout.tsx                      <- minimal layout, dark background
    globals.css                     <- design tokens (colours, fonts)
    experiments/
      new/
        page.tsx                    <- PAGE 2: Hypothesis input + inline validation + Run button
      [id]/
        pipeline/
          page.tsx                  <- PAGE 3: Live SSE pipeline — 4 stages, QC reveal, plan CTA
        plan/
          page.tsx                  <- PAGE 4: Full tabbed experiment plan (pinned header + 6 tabs)
    api/
      pipeline/
        route.ts                    <- SSE streaming endpoint (runs all 4 agents sequentially)
      experiments/
        route.ts                    <- POST: create experiment in DB, return id
        [id]/
          route.ts                  <- GET: fetch experiment with plan by ID
  lib/
    anthropic.ts                    <- Anthropic client + MODEL constant
    agents/
      orchestrator.ts               <- parse & validate hypothesis (Claude API call — structured JSON)
      literature-qc.ts              <- novelty classification (Semantic Scholar + Tavily)
      planner.ts                    <- full plan generation (Claude LLM call)
      critic.ts                     <- plan validation (Claude LLM call)
    semantic-scholar.ts             <- Semantic Scholar API client
    types.ts                        <- ExperimentPlan, ProtocolStep, Material, BudgetLine etc.
    db.ts                           <- (keep as-is)
    tavily.ts                       <- (keep as-is, add searchProtocolSources export)
    workflow-types.ts               <- (keep as-is)
  components/
    hypothesis-input.tsx            <- textarea + inline validation hints + Run button
    pipeline-progress.tsx           <- 4-stage live strip (SSE-driven)
    novelty-badge.tsx               <- not_found / similar_exists / exact_match badge
    plan-summary-card.tsx           <- at-a-glance header: badge + score + budget + duration
    tabs/
      protocol-tab.tsx              <- numbered steps with source citations + critical notes
      materials-tab.tsx             <- table: name, supplier, cat#, qty, cost
      budget-tab.tsx                <- table: category, item, cost; footer total
      timeline-tab.tsx              <- phases with dependencies and milestones
      validation-tab.tsx            <- endpoints, thresholds, controls
      sources-tab.tsx               <- all cited URLs with type badge
    critic-warnings.tsx             <- amber warning list below tabs
    scientist-review.tsx            <- stretch goal: inline annotation per section
```

---

## Existing Types to Keep (`src/lib/workflow-types.ts`)

These are already defined — DO NOT redefine them. Import from this file:

```typescript
// Already exists — keep as-is
type NoveltySignal = "not_found" | "similar_exists" | "exact_match"
type QuestionProfile = { experimentClass, primaryObjective, primaryEndpoint, intervention, modelSystem, rationale, keyTerms[], riskFlags[] }
type LiteratureQcSummary = { noveltySignal, searchQuery, referenceCount, rationale, references[] }
type CriticSummary = { confidenceScore: number, approved: boolean, warnings: string[], blockers: string[], summary: string }
```

---

## New Types to Define (`src/lib/types.ts`)

```typescript
// Created: 2026-04-25

export interface ProtocolStep {
  stepNumber: number;
  title: string;
  description: string;
  duration: string;
  sourceProtocol?: string;   // e.g. "protocols.io/FITC-gut-barrier-v2"
  sourceUrl?: string;
  criticalNote?: string;     // e.g. "FITC-dextran dose: confirm 44mg/kg"
}

export interface Material {
  name: string;
  supplier: string;          // e.g. "Sigma-Aldrich"
  catalogNumber: string;     // e.g. "D1537"
  quantity: string;          // e.g. "100mg"
  unitCost: number;          // in GBP
  totalCost: number;
  notes?: string;
}

export interface BudgetLine {
  category: string;          // e.g. "Reagents", "Animals", "Analysis"
  item: string;
  cost: number;              // exact number, NOT a range
  currency: string;          // "GBP"
  notes?: string;
}

export interface TimelinePhase {
  phase: number;
  title: string;             // e.g. "Week 1–2 | Animal housing and acclimatisation"
  duration: string;
  dependencies: string[];    // e.g. ["Phase 1 complete", "Materials procured"]
  milestones: string[];
}

export interface Source {
  title: string;
  url: string;
  type: "protocol" | "paper" | "supplier";
}

export interface ExperimentPlan {
  generatedAt: string;       // always "2026-04-25"
  hypothesis: string;
  title: string;
  summary: string;           // 2-sentence top-line
  protocol: ProtocolStep[];
  materials: Material[];
  budget: BudgetLine[];
  totalBudgetEstimate: number;
  currency: string;          // "GBP"
  timeline: TimelinePhase[];
  validationApproach: string;
  sources: Source[];
}

// SSE event shape
export type PipelineEvent =
  | { stage: "orchestrator"; status: "running" | "completed" | "failed"; data?: QuestionProfile; error?: string }
  | { stage: "literature_qc"; status: "running" | "completed" | "failed"; data?: LiteratureQcSummary; error?: string }
  | { stage: "planner"; status: "running" | "completed" | "failed"; data?: ExperimentPlan; error?: string }
  | { stage: "critic"; status: "running" | "completed" | "failed"; data?: CriticSummary; error?: string }
  | { stage: "done"; status: "completed" }
  | { stage: "error"; status: "failed"; error: string };
```

---

## Anthropic Client (`src/lib/anthropic.ts`)

```typescript
// Created: 2026-04-25
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
```

---

## Agent System Prompts

### ① Orchestrator Agent (`src/lib/agents/orchestrator.ts`)

**This is a Claude LLM call — not a heuristic parser.** The reason the original implementation was broken is that it used regex and keyword matching here. This must use Claude.

System prompt:
```
You are a scientific hypothesis parser. Extract structured fields from a natural language hypothesis.

Return ONLY valid JSON with this shape — no prose, no markdown, no code fences:
{
  "experimentClass": "in_vivo_biology" | "cell_biology" | "diagnostics" | "climate_biotech" | "general_experiment",
  "primaryObjective": "string",
  "primaryEndpoint": "string — the measurable outcome with threshold if stated",
  "intervention": "string — what is being done",
  "modelSystem": "string — organism, cell line, or system",
  "rationale": "string — the mechanistic reason given",
  "keyTerms": ["array", "of", "max", "8", "search", "terms"],
  "riskFlags": ["array of execution risks identified"],
  "isValid": true | false,
  "validationWarnings": ["issues: missing threshold, missing control, too vague, etc."]
}

A valid hypothesis must have: (1) a specific intervention, (2) a measurable outcome with a numeric threshold, (3) a control condition implied or stated. Flag missing elements in validationWarnings but still parse what you can.
```

Implementation pattern (Claude SDK):
```typescript
import { anthropic, MODEL } from "@/lib/anthropic";
import type { QuestionProfile } from "@/lib/workflow-types";

export async function runOrchestrator(hypothesis: string): Promise<QuestionProfile & { isValid: boolean; validationWarnings: string[] }> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: ORCHESTRATOR_SYSTEM_PROMPT,  // the prompt above
    messages: [{ role: "user", content: hypothesis }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  // Strip any accidental code fences before parsing
  const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean);
}
```

### ② Literature QC Agent (`src/lib/agents/literature-qc.ts`)

This agent is NOT an LLM call — it uses Semantic Scholar API + Tavily, then classifies novelty by term overlap score. No LLM needed here. Keep it fast.

```typescript
// Semantic Scholar endpoint (free, no auth)
// GET https://api.semanticscholar.org/graph/v1/paper/search
//   ?query={encoded_query}
//   &fields=title,authors,year,externalIds,openAccessPdf
//   &limit=5

// Novelty classification logic:
// - 0 results from both sources → "not_found"
// - Top result has ≥5 overlapping key terms → "exact_match"
// - Otherwise → "similar_exists"
```

### ③ Planner Agent (`src/lib/agents/planner.ts`)

```
System prompt:
You are an expert experimental scientist and lab operations specialist at a world-class CRO.

Your task: generate a COMPLETE, OPERATIONALLY EXECUTABLE experiment plan.

CRITICAL REQUIREMENTS — violating any of these is a failure:
1. Every protocol step MUST cite a real published source (protocols.io, Nature Protocols, Bio-protocol, JOVE, or peer-reviewed paper). Include the URL.
2. Every reagent MUST include: supplier name, REAL catalog number, quantity, unit cost in GBP. Use Sigma-Aldrich (sigmaaldrich.com), Thermo Fisher, or equivalent. Do NOT invent catalog numbers — use only catalog numbers you have high confidence are real.
3. Budget MUST use exact numbers (e.g., £340), never ranges (e.g., "£300–500"). Sum to a realistic 2026 UK market total.
4. Timeline MUST reflect lab reality: cell culture takes days, PCR takes hours, animal studies take weeks. Do not compress.
5. The validation approach MUST directly test the stated measurable outcome and threshold.

Use the provided Tavily evidence as your primary grounding. Extract protocol URLs and cite them in steps.

Return ONLY valid JSON matching the ExperimentPlan schema. No prose. No markdown. No code fences.
The generatedAt field must be "2026-04-25".
```

### ④ Critic Agent (`src/lib/agents/critic.ts`)

```
System prompt:
You are a senior research scientist reviewing an AI-generated experiment plan for operational realism.

Evaluate strictly:
1. Are reagent concentrations within realistic ranges for this experiment type?
2. Is the timeline physically achievable? (Flag if 48hr incubation is scheduled for 2hrs)
3. Does the validation approach actually measure what the hypothesis claims?
4. Are there missing safety notes for hazardous materials?
5. Are catalog numbers plausible for the listed suppliers? (Flag obvious fabrications)
6. Is the budget realistic for a UK lab in 2026?

Return ONLY valid JSON:
{
  "confidenceScore": 0-100,
  "approved": true if score >= 70,
  "warnings": ["specific named issues, e.g. 'FITC-dextran dose not specified — confirm 44mg/kg'"],
  "blockers": ["critical issues that prevent lab execution"],
  "summary": "one sentence"
}
```

---

## Streaming API Route (`src/app/api/pipeline/route.ts`)

Use Next.js `ReadableStream` with SSE format. Each agent completes sequentially and emits an event:

```typescript
// SSE format: each line is "data: {json}\n\n"
// Use: new ReadableStream({ start(controller) { ... controller.enqueue(...) } })
// Set headers: Content-Type: text/event-stream, Cache-Control: no-cache

// Pipeline sequence (sequential, not parallel):
// 1. Orchestrator → emit orchestrator:running, orchestrator:completed
// 2. Semantic Scholar + Tavily QC → emit literature_qc:running, literature_qc:completed
// 3. Tavily evidence fetch (for protocol grounding) → (no separate event, feeds planner)
// 4. Planner (Claude) → emit planner:running, planner:completed
// 5. Critic (Claude) → emit critic:running, critic:completed
// 6. Emit done
```

---

## Tavily Client (keep as-is, but add a protocol-specific search)

The existing `src/lib/tavily.ts` has `searchScientificEvidence`. Add a second export:

```typescript
export async function searchProtocolSources(experimentClass: string, keyTerms: string[]) {
  // Same Tavily client, but target protocol repositories:
  // include_domains: ["protocols.io", "bio-protocol.org", "nature.com", "jove.com"]
  // query: join keyTerms + experimentClass
  // This feeds the Planner with real protocol URLs to cite
}
```

---

## Semantic Scholar Client (`src/lib/semantic-scholar.ts`)

```typescript
// Created: 2026-04-25
// Free API, no auth required

const BASE = "https://api.semanticscholar.org/graph/v1/paper/search";

export async function searchLiterature(query: string) {
  const url = `${BASE}?query=${encodeURIComponent(query)}&fields=title,authors,year,externalIds,openAccessPdf&limit=5`;
  const res = await fetch(url, { headers: { "User-Agent": "OperonAI/1.0" } });
  if (!res.ok) return { papers: [] };
  const data = await res.json();
  return { papers: data.data ?? [] };
}
```

---

## UI Design Direction

**Aesthetic:** Scientific instrument — NOT a SaaS dashboard.
- Background: near-black (`#0a0b0f` or `#0f1117`)
- Surface: dark slate (`#141720`, `#1a1d2e`)
- Text: crisp white (`#f0f0f5`)
- Accent: precise blue-violet (`#6366f1` or `#7c8af7`)
- Warnings: amber (`#f59e0b`)
- Success/Approved: green (`#4ade80`)
- Danger/Blocker: red (`#f87171`)
- Typography: system monospace for data, sans-serif for prose
- Borders: subtle (`1px solid #2a2d3e`)
- Rounded: generous (`0.75rem`–`1.5rem`)

**No gradients. No shadows. No hero sections. Think lab equipment readout, not landing page.**

---

## UI — Four Pages, One Job Each

Each page has a single purpose. The user moves forward in a straight line: start → input → watch → read. No going back mid-run. No collapsing sections. No multi-step modals. Clean division at every boundary.

```
Page 1  /                          Dashboard          — see past work, start fresh
Page 2  /experiments/new           Hypothesis Input   — write and submit
Page 3  /experiments/[id]/pipeline Live Pipeline      — watch progress, see QC
Page 4  /experiments/[id]/plan     Full Plan          — read, navigate, review
```

---

### Page 1 — Dashboard (`/`)

**Purpose:** orientation and entry point. Show what has been generated before. One clear action.

```
HEADER
  Operon AI · AI Scientist           [Tavily] [Claude]  ← status dots

HERO ROW
  "Generate an executable experiment plan from a hypothesis."
  [Start New Experiment]   <- primary CTA, top-right or centred below copy

PAST EXPERIMENTS TABLE  (empty state: "No experiments yet — start one above")
  Columns: Hypothesis (truncated) | Novelty | Score | Status | Date
  Row: "Supplementing C57BL/6 mice with LGG..." | SIMILAR EXISTS | 84 | Done | 2026-04-25
  Row: ...
  Each row is clickable → /experiments/[id]/plan (if done) or /experiments/[id]/pipeline (if running)
```

---

### Page 2 — Hypothesis Input (`/experiments/new`)

**Purpose:** take one input, validate it, fire the pipeline. Nothing else on this page.

```
HEADER
  <- Dashboard     Operon AI

INPUT CARD
  "Your Scientific Hypothesis"
  Textarea (8 rows)
  Placeholder: "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks
  will reduce intestinal permeability by at least 30% compared to controls,
  measured by FITC-dextran assay..."

  HINT STRIP  (live feedback, appears as user types — client-side heuristics only)
    green tick    "Intervention detected"
    green tick    "Model system identified"
    amber warn    "No numeric threshold (e.g. 'at least 30%')"
    amber warn    "Control condition not stated"

  [Run Analysis →]   button
    - disabled if textarea empty
    - On click: POST /api/experiments → receive {id}, redirect to /experiments/[id]/pipeline

GUIDE CALLOUT  (below card, small text)
  "A strong hypothesis names: an intervention, a measurable outcome with a numeric threshold,
  and a control condition. Example: 'will reduce X by at least 30% compared to controls'."
```

---

### Page 3 — Live Pipeline (`/experiments/[id]/pipeline`)

**Purpose:** show the user that real work is happening and in what order. Reveal QC before plan. No interactions until pipeline ends.

```
HEADER
  <- Dashboard     Operon AI · Running

HYPOTHESIS RECAP  (non-editable, top of page, small text)
  "Supplementing C57BL/6 mice with LGG..."

PIPELINE STRIP  (4 stages, SSE-driven)
  ① Parsing hypothesis        [running / done / failed]
  ② Literature QC             [queued / running / done]
  ③ Generating plan           [queued / running / done]
  ④ Critic validation         [queued / running / done]

  Visual treatment:
  - running: amber pulsing dot + label + elapsed seconds
  - done: green tick + label + completion time
  - failed: red cross + label + error message

LITERATURE QC REVEAL  (appears immediately when Stage 2 completes)
  Novelty badge (colour-coded per badge table)
  "2 prior references found"
  [1] Title of most relevant paper — year — source URL
  [2] Second reference...

  Note: Stage 3 (plan generation) runs in the background while user reads QC.
  The plan is NOT revealed until Stage 4 (critic) also completes.

PLAN READY CARD  (appears when Stage 4 completes, replaces running state)
  [SIMILAR EXISTS]  Score: 84/100  GBP 8,400  6 weeks
  "Operon AI generated an 8-step protocol grounded in 4 Tavily sources,
   with materials from Sigma-Aldrich and Thermo Fisher."
  [Open Full Plan →]   navigates to /experiments/[id]/plan

ERROR STATE  (if any stage fails)
  Red card: stage name + error message + [Try Again] button that re-runs from /experiments/new
```

---

### Page 4 — Full Plan (`/experiments/[id]/plan`)

**Purpose:** the deliverable. Present the full experiment plan in navigable tabs. This is what judges evaluate.

```
NAV BAR
  <- Dashboard     Operon AI

PINNED HEADER  (sticky — visible on all tabs as user scrolls)
  "Gut Permeability — LGG Probiotic Study"        ← plan title
  [SIMILAR EXISTS]  Score: 84/100  GBP 8,400  6 weeks

TAB BAR  (sticky, below pinned header)
  [Protocol]  [Materials]  [Budget]  [Timeline]  [Validation]  [Sources]

--- PROTOCOL TAB (default) ---
  Step 1 · Prepare FITC-dextran solution
    Duration: 30 min
    Source: protocols.io/FITC-gut-barrier-v2    (clickable link, opens new tab)
    Critical note (amber): "Confirm dose 44 mg/kg before gavage"

  Step 2 · Animal gavage administration
    Duration: 15 min per animal
    Source: bio-protocol.org/...
    ...

--- MATERIALS TAB ---
  Table: Name | Supplier | Cat# | Quantity | Unit Cost | Total
  FITC-Dextran 70kDa  | Sigma-Aldrich | D1537  | 100 mg     | GBP 340 | GBP 340
  L. rhamnosus GG     | Sigma-Aldrich | L6876  | 5x10^8 CFU | GBP 280 | GBP 280
  ...
  Footer row: Materials subtotal: GBP X,XXX

--- BUDGET TAB ---
  Table: Category | Item | Cost (GBP)
  Reagents     | FITC-dextran reagent kit   | 340
  Reagents     | LGG supplement             | 280
  Animals      | C57BL/6 mice x10           | 2,800
  Consumables  | Gavage needles, tubes      | 180
  Analysis     | Western blot reagents      | 400
  Analysis     | ELISA kit                  | 600
  Footer: TOTAL: GBP 8,400

--- TIMELINE TAB ---
  Phase 1 · Weeks 1–2 · Animal housing and acclimatisation
    Depends on: ethics approval in place, animals delivered
    Milestone: baseline body weight recorded, cages randomised

  Phase 2 · Weeks 3–6 · Daily LGG gavage treatment
    Depends on: Phase 1 complete, supplement stocks confirmed
    Milestone: treatment log completed daily

  Phase 3 · Week 7 · FITC-dextran permeability assay
    Depends on: Phase 2 complete
    Milestone: fluorescence readings captured, data exported

--- VALIDATION TAB ---
  Primary endpoint: FITC-dextran gut permeability assay
    Threshold: ≥30% reduction vs control
    Measurement window: 4 hours post-gavage
  Secondary endpoint: Western blot — claudin-1 and occludin protein levels
  Negative control: vehicle-only gavage arm

--- SOURCES TAB ---
  All URLs cited across protocol, materials, and papers
  Each row: [protocol / paper / supplier] badge · title · URL

CRITIC WARNINGS  (panel below tab content, amber, only shown if warnings exist)
  "FITC-dextran dose not specified — confirm 44 mg/kg with PI"
  "Sample size n=10 may be underpowered for 30% effect size"

GENERATION METADATA  (collapsed disclosure at bottom)
  Model: claude-sonnet-4-5 · Generated: 2026-04-25 · Tavily queries: [logged list]

STRETCH GOAL — Scientist Review  (collapsible section at very bottom)
  "Rate and correct each plan section. Your corrections improve future plans automatically."
  [Open Review Mode]
```

---

### Novelty Badge Reference

| Signal | Badge colour | Text | Meaning |
|---|---|---|---|
| not_found | Dark green (#166534) | NOT FOUND (tick) | No prior work found — novel territory |
| similar_exists | Dark amber (#78350f) | SIMILAR EXISTS (warning) | Adjacent work exists — review references |
| exact_match | Dark red (#7f1d1d) | EXACT MATCH (cross) | This protocol has been done — strong review required |

### Confidence Score Display

| Score | Colour | Label |
|---|---|---|
| 70-100 | Green | Approved — lab-ready |
| 50-69 | Amber | Conditional — review warnings before executing |
| 0-49 | Red | Blocked — resolve critic issues before ordering materials |

---

## Prisma Schema Summary (do not modify)

Key models (already exist, use them for persistence):
- `ResearchQuestion` — stores hypothesis, profile, literatureQcJson
- `EvidenceSource` — Tavily results per question
- `PlanPreview` — generated plan (store as JSON fields)
- `ExperimentPlan` — promoted/active plan
- `PlanningRun` — run history with stageDataJson

The pipeline route should: create a `PlanningRun`, update it at each stage, create a `PlanPreview` with the generated plan, store `literatureQcJson` on the question.

---

## Authoritative Sources — Configure These Everywhere

These are the exact sources from the challenge brief. They must be wired into:
1. Tavily `include_domains` (for protocol and evidence search)
2. The Planner agent system prompt (so it cites from these specifically)
3. The Literature QC agent (alongside Semantic Scholar)

### Protocol Repositories (primary citation targets)

| Source | URL | Use For |
|---|---|---|
| protocols.io | `protocols.io` | Step-by-step lab protocols, structured format, most active |
| Bio-protocol | `bio-protocol.org` | Peer-reviewed protocols linked to papers |
| Nature Protocols | `nature.com/nprot` | Premium detail, authoritative |
| JOVE | `jove.com` | Video protocols with written transcripts |
| OpenWetWare | `openwetware.org` | Community protocols |

### Supplier References (for catalog numbers + pricing)

| Supplier | URL | Use For |
|---|---|---|
| Thermo Fisher | `thermofisher.com` | Reagents, kits, instruments, cell culture |
| Sigma-Aldrich | `sigmaaldrich.com` | Chemicals, reagents, biochemicals |
| Promega | `promega.com` | Assay kits, luciferase reagents, cloning |
| Qiagen | `qiagen.com` | Nucleic acid extraction, PCR reagents |
| IDT | `idtdna.com` | Primers, oligos, qPCR tools |

### Cell Line and Reagent References

| Source | URL | Use For |
|---|---|---|
| ATCC | `atcc.org` | Cell line protocols, authentication |
| Addgene | `addgene.org` | Cloning and transfection protocols |

### Scientific Standards (cite where relevant)

| Standard | URL | Use For |
|---|---|---|
| MIQE Guidelines | `ncbi.nlm.nih.gov/pmc/articles/PMC2737408` | qPCR experimental standards |

---

### Tavily Domain Configuration

Update `src/lib/tavily.ts` — replace the existing `include_domains` array with the full list:

```typescript
// For general scientific evidence search (searchScientificEvidence):
include_domains: [
  "nature.com",
  "science.org",
  "cell.com",
  "nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "bio-protocol.org",
  "protocols.io",
  "jove.com",
  "biorxiv.org",
  "pmc.ncbi.nlm.nih.gov",
]

// For protocol-specific search (searchProtocolSources — new function):
include_domains: [
  "protocols.io",
  "bio-protocol.org",
  "nature.com/nprot",
  "jove.com",
  "openwetware.org",
  "thermofisher.com",
  "sigmaaldrich.com",
  "promega.com",
  "qiagen.com",
  "atcc.org",
  "addgene.org",
]
```

---

### Planner Agent — Updated Domain Awareness

Add this section to the Planner system prompt after the CRITICAL REQUIREMENTS:

```
CITATION SOURCES — cite only from these in protocol steps:
- Protocols: protocols.io, bio-protocol.org, nature.com/nprot, jove.com, openwetware.org
- Papers: pubmed.ncbi.nlm.nih.gov, pmc.ncbi.nlm.nih.gov, biorxiv.org
- Suppliers for catalog numbers: sigmaaldrich.com, thermofisher.com, promega.com, qiagen.com, idtdna.com, atcc.org, addgene.org

CATALOG NUMBER RULES:
- Sigma-Aldrich format: letter + 4–5 digits (e.g. D1537, L6876, F7508)
- Thermo Fisher format: alphanumeric (e.g. 15596026, A10931)
- Promega format: letter + 4 digits (e.g. E1501, G7571)
- If you are not confident a catalog number is real, use the supplier's search URL format and note "verify catalog number" in criticalNote
- Never fabricate a catalog number you are not confident exists

SCIENTIFIC STANDARDS:
- For any qPCR steps, reference MIQE guidelines: ncbi.nlm.nih.gov/pmc/articles/PMC2737408
- For cell line work, reference ATCC authentication: atcc.org
```

---

## Sample Test Inputs

Use these four to verify the pipeline end-to-end:

**1. Gut Health (mouse in vivo)**
> Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.

**2. Diagnostics (biosensor)**
> A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.

**3. Cell Biology (cryopreservation)**
> Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.

**4. Climate Biotech (CO₂ fixation)**
> Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.

---

## Environment Variables (already in .env.local)

```
ANTHROPIC_API_KEY=sk-ant-...   ← set by user
TAVILY_API_KEY=tvly-dev-...    ← set, working
DATABASE_URL=file:./dev.db     ← SQLite, ready
ANTHROPIC_MODEL=claude-sonnet-4-5
```

---

## Quality Gates — Check Before Calling Done

- [ ] Every protocol step has a real source URL (not placeholder)
- [ ] Every material has supplier + catalog number (not "TBD")
- [ ] Budget uses exact numbers, not ranges
- [ ] Timeline reflects real lab timing (no 4-hour incubations that need 48hrs)
- [ ] Novelty signal shown BEFORE plan reveals
- [ ] Critic runs after plan — plan never shown without confidence score
- [ ] All dates in generated content read `2026-04-25`
- [ ] TypeScript strict mode — no `any`
- [ ] Mobile responsive
- [ ] Dev server starts clean: `npm run dev`

---

## Stretch Goal — Scientist Review

Only after core pipeline is working:

1. After plan display, add a collapsible `ScientistReview` section
2. Each plan section (protocol, materials, budget, timeline, validation) gets a star rating (1–5) + text correction input
3. On submit: store corrections in localStorage keyed by `experimentClass`
4. On next generation: retrieve corrections for matching `experimentClass`, inject as few-shot examples into the Planner system prompt
5. **The winning demo:** generate plan → scientist corrects one thing → generate again → judge watches the correction reflected automatically

---

## Build Order (fastest path to working demo)

1. `npm install @anthropic-ai/sdk`
2. `src/lib/anthropic.ts` — Anthropic client + MODEL constant
3. `src/lib/types.ts` — ExperimentPlan, ProtocolStep, Material, BudgetLine, etc.
4. `src/lib/semantic-scholar.ts` — free literature API client
5. `src/lib/agents/orchestrator.ts` — **Claude LLM call**, returns QuestionProfile JSON
6. `src/lib/agents/literature-qc.ts` — Semantic Scholar + Tavily + novelty classifier
7. `src/lib/agents/planner.ts` — Claude LLM call with Tavily evidence grounding
8. `src/lib/agents/critic.ts` — Claude LLM call, returns CriticSummary
9. `src/app/api/pipeline/route.ts` — SSE endpoint, all 4 agents sequential
10. `src/app/api/experiments/route.ts` — POST: create experiment, return id
11. `src/app/api/experiments/[id]/route.ts` — GET: fetch experiment + plan
12. `src/app/layout.tsx` + `src/app/globals.css` — dark theme, fonts
13. `src/app/page.tsx` — **Page 1**: Dashboard with past experiments list
14. `src/app/experiments/new/page.tsx` — **Page 2**: Hypothesis input + inline hints + submit
15. `src/app/experiments/[id]/pipeline/page.tsx` — **Page 3**: Live SSE 4-stage progress + QC reveal + plan CTA
    Components: PipelineStrip, NoveltyBadge, PlanSummaryCard
16. `src/app/experiments/[id]/plan/page.tsx` — **Page 4**: Tabbed full plan
    Components: PinnedHeader, TabBar, ProtocolTab, MaterialsTab, BudgetTab, TimelineTab, ValidationTab, SourcesTab, CriticWarnings
17. Test with all 4 sample inputs — check every quality gate
18. Stretch: `ScientistReview` component + localStorage feedback loop
