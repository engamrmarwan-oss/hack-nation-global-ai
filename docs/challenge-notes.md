# Challenge Notes

> Populated by: Codex
> Updated: 2026-04-25 21:32 CEST

## Requirements Document (source of truth)
The full original challenge brief lives at:
`/Users/amrmarwan/Downloads/04_The_AI_Scientist.docx.md`

**All auditing agents must read this file directly** before assessing compliance. The sections below are a structured interpretation, not a substitute.

## Challenge Statement
Build an AI-powered tool that takes a scientific question and produces a complete, operationally realistic experiment plan that a real lab could execute.

## Required 3-Stage Workflow (from brief)
The brief defines exactly three stages — all three must be present and visually distinct:

| Stage | Description |
|-------|-------------|
| 1. Input | Natural language scientific question entered by the user |
| 2. Literature QC | Has this exact protocol been done before? Must output a novelty signal. |
| 3. Experiment Plan | Full operational plan — the core deliverable |

## Key Requirements
- Accept a scientific question as the primary input.
- Produce a practical experiment plan instead of generic brainstorming text.
- Include execution detail such as protocol logic, controls, materials, and real-world feasibility signals.
- Present the result clearly enough to be convincing in both plan quality and UI/UX.

## Judging Priorities (working interpretation)
| Criterion | Notes |
|-----------|-------|
| Plan quality | The output must look executable, not speculative. |
| Technical execution | The system should show real orchestration, grounding, and structure. |
| UI / UX clarity | Judges should understand the workflow quickly and trust the output. |
| Credibility | References, controls, and sourcing signals improve confidence. |
| Demo quality | The happy path must feel polished and coherent end to end. |

## Sponsor Prizes Available
| Sponsor | How We Can Use It | Fit |
|---------|-------------------|-----|
| Tavily | Scientific retrieval, protocol references, sourcing pages, vendor context | High |
| Vercel | Demo deployment for judges | High |
| Lovable | Optional UI ideation only | Low |
| Cursor | Optional coding support only | Low |

## My Project Fit
- Why this challenge suits the current direction: Crystal already solved the harder control-plane problems of staged generation, preview, validation, and change governance.
- Risks: If we expose too much inherited Crystal vocabulary, the product will feel repurposed instead of purpose-built.
- Unfair advantages I have: a proven architecture base, a fresh repo, and a clear sponsor integration path with Tavily + Vercel.

## Chosen Approach
Build a fresh science-native product that reuses Crystal's strongest backend mechanisms, then add Tavily for live evidence retrieval and Vercel for deployment so the final demo is both grounded and polished.

## Resources & Links
- Tavily: retrieval sponsor candidate
- Vercel: deployment sponsor candidate
- Crystal local source snapshot: `/Users/amrmarwan/Downloads/crystal`

---

## Implementation Audit (vs. requirements document — 2026-04-25)

This audit compares the current codebase at `src/` against the brief at `/Users/amrmarwan/Downloads/04_The_AI_Scientist.docx.md`.

### What is implemented correctly ✅
- Natural language question intake with optional objective field
- Evidence retrieval via Tavily stored as `EvidenceSource` records
- Plan preview with sections: protocol, controls, timeline, materials, budget, staffing, risks, validation
- Staged preview → apply workflow (plan is not active until explicitly promoted)
- Polished multi-panel UI with workflow state indicators

### Recently closed
- Timeline section added across Prisma models, planner output, preview rendering, and active-plan rendering on 2026-04-25

### Critical gaps — must fix before submission

**GAP-1: No Literature QC novelty signal**
The brief requires a clearly labelled novelty verdict: `"not found"` / `"similar work exists"` / `"exact match found"`. The current UI shows raw evidence items in an "evidence panel", but never classifies them into a QC verdict. The brief says this signal must appear *before* the experiment plan is generated.
- Location to fix: evidence retrieval route + the legacy workspace UI
- Spec reference: "Literature Quality Control Step" section of the brief

**GAP-3: No catalog numbers or supplier names in materials**
The brief says materials must include "specific reagents, catalog numbers, suppliers". The current materials section outputs generic prose. The "What Good Looks Like" example shows a catalog-number-level materials list.
- Location to fix: `src/lib/planner.ts` materials generation + UI rendering
- Spec reference: "Materials and supply chain — specific reagents, catalog numbers, suppliers"

**GAP-4: Plan generation is entirely template-based — no LLM**
`src/lib/planner.ts` uses string interpolation and keyword-matching on evidence snippets. The brief requires a plan "grounded in real published protocols". A judge will see through a template plan for any of the four sample inputs. The architecture doc says "OpenAI for generation" but no API call is made.
- Location to fix: `src/lib/planner.ts` (replace with Claude/OpenAI API call using retrieved evidence)
- Spec reference: "Protocol — step-by-step methodology grounded in real published protocols"

**GAP-5: Budget is vague ranges, not line-item estimates**
Current output: `"€450 - €1,500"` with 3 generic categories. The brief's example shows a specific `£12,000 budget estimate` with named line items. The spec lists "Budget — realistic cost estimate with line items" as a required section.
- Location to fix: `src/lib/planner.ts` budget generation
- Spec reference: "Budget — realistic cost estimate with line items"

**GAP-6: Literature QC is not visually distinct before the plan**
The brief says the UI must "See the literature QC result clearly before the plan is generated." Currently evidence retrieval and plan generation are parallel independent buttons with no enforced order or clear QC verdict displayed.
- Location to fix: legacy workspace review UI — add a QC badge/card between the evidence and the plan CTA

### Stretch goal — not started
- Scientist review interface (structured rating + annotation per plan section)
- Feedback store (corrections tagged by experiment type)
- Generation layer incorporating prior feedback as few-shot examples

### Priority order for remaining build time
| Priority | Gap | Files |
|----------|-----|-------|
| 1 | Replace `planner.ts` template with LLM call (Claude/OpenAI) | `src/lib/planner.ts`, `src/app/api/workspace/questions/[questionId]/preview/route.ts` |
| 2 | Add novelty signal classification to evidence retrieval | `src/app/api/workspace/questions/[questionId]/retrieve/route.ts`, UI |
| 3 | Add catalog numbers + supplier names to materials | `src/lib/planner.ts` |
| 4 | Surface lit QC verdict as distinct badge before plan CTA | Legacy workspace review UI |
| 5 | Make budget line-item specific | `src/lib/planner.ts` |
