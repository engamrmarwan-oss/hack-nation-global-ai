# Migration Context — Crystal to Operon AI

> Purpose: keep the new repo connected to Crystal's freshest architecture without exposing stale branding or unrelated product framing.
> Source snapshot: `/Users/amrmarwan/Downloads/crystal`
> Source branch at inspection time: `design-variations/claude-design-v1`
> Important note: the Crystal source is intentionally treated as a **working-tree snapshot**, not just the last commit, because relevant uncommitted changes exist locally.

## Migration Principles
- Copy structure, not branding.
- Start a fresh product narrative in the new repo.
- Reuse only mechanisms that directly strengthen the AI Scientist challenge.
- Exclude stale data, old build artifacts, and unrelated compliance surfaces.

## What We Reuse from Crystal
| Crystal Subsystem | Why It Matters | Operon AI Translation |
|-------------------|---------------|------------------------|
| Guided intake / chat flow | Turns ambiguous input into a structured object | Research question intake |
| Structured spec generation | Produces explicit, reviewable contracts | Protocol / experiment spec |
| Staged background pipeline | Supports multi-step generation and validation | Experiment planning pipeline |
| Preview-before-apply | Keeps operator trust high | Draft plan review |
| Source grounding / provenance | Makes outputs defensible | Evidence references |
| Verification model | Supports readiness and quality checks | Validation / feasibility layer |
| Change-set / reconciliation model | Keeps updates explicit and traceable | Plan revision workflow |
| Retrieval pattern | Grounds AI output in evidence | Tavily-backed scientific retrieval |

## What We Intentionally Do NOT Reuse Publicly
- Crystal branding
- Compliance / regulatory framing
- Release-readiness language
- Framework-specific UI and terminology
- Jira / Confluence / export features unless later reintroduced intentionally

## Renaming Strategy
| Crystal Term | Operon AI Term |
|--------------|-----------------|
| Requirement | Plan item / protocol clause / experiment output |
| RequirementSourceReference | Evidence reference |
| DocumentExtractionPreview | Draft experiment plan |
| Process Map | Experiment blueprint |
| RequirementChangeSet | Plan change set |
| Verification status | Validation / execution readiness |

## Sponsor Integration Placement
### Tavily
Use Tavily as the first retrieval layer for:
- protocol and method discovery
- scientific reference gathering
- vendor / sourcing context
- cost and availability signal enrichment

### Vercel
Use Vercel as the delivery layer for:
- public judging URL
- rapid iteration previews
- final demo hosting

## Freshness / Compliance Rules for the New Repo
Do not copy these from Crystal:
- `.git`
- `dev.db`
- `.next`
- `uploads/`
- `reports/`
- `test-results/`
- generated exports / zips
- unrelated PDFs and demo files
- stale README / pitch text / brand assets

## Immediate Build Order
1. Land a fresh Next.js / TypeScript / Prisma shell in the new repo.
2. Define challenge-native models and vocabulary.
3. Port intake, preview, grounding, and validation mechanisms from Crystal concepts.
4. Add Tavily retrieval.
5. Deploy on Vercel.

## Why This Bridge Exists
This document is the private continuity layer. It lets us move fast with Crystal's freshest architectural thinking while ensuring the shipped repo looks current, focused, and purpose-built for the challenge.
