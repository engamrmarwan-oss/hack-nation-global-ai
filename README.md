# Operon AI

> **Hack-Nation × World Bank Youth Summit 2026 — Challenge 04: The AI Scientist (Fulcrum Science)**
> Solo submission by Amr Marwan

**Operon AI turns a scientific hypothesis into a complete, evidence-grounded, QA-validated experiment plan in under 60 seconds — through a five-agent AI pipeline with hard scientific rigor gates.**

---

## 🎬 Demo & Presentation

| Resource | Link |
|----------|------|
| 📹 Product Demo Video | [Watch Demo](https://github.com/engamrmarwan-oss/hack-nation-global-ai/raw/main/Operon%20AI%20Demo.mp4) |
| 🔬 Technical Walkthrough Video | [Watch Technical](https://github.com/engamrmarwan-oss/hack-nation-global-ai/raw/main/Operon%20AI%20Tech.mp4) |
| 📊 Technical Presentation (Prezi) | [View Presentation](https://prezi.com/view/PvqXSgrfWil7iYr5TO0K/?referral_token=8VhIUmlnB3FN) |

---

## The Problem

Scientists lose days — sometimes weeks — turning a hypothesis into a lab-ready experiment plan. The process is entirely manual: literature searches are ad hoc, failure modes are missed, controls go undefined, and plans are frequently rejected by reviewers before a single experiment runs. There is no structured, AI-assisted layer between a scientist's idea and a rigorous experiment design.

## The Solution

Operon AI is a five-agent pipeline that enforces scientific rigor at every step. A 7-field structured intake wizard captures the hypothesis. Five Claude claude-sonnet-4-5 agents then run in sequence — auditing assumptions, retrieving live evidence, generating the plan, and validating it through a hard QA gate — before a single word of the experiment plan is shown to the researcher.

## How It Works

1. **Hypothesis Intake** — Researcher fills a 7-field wizard: domain, intervention, model system, endpoint, success threshold, control, and proposed mechanism. Synthesised into a typed planning brief.
2. **Hypothesis Health (Agent 1)** — Audits 7 scientific dimensions (measurability, specificity, mechanistic grounding, falsifiability, ethical risk, novelty, feasibility). Grades A–D. Any D blocks the pipeline.
3. **Literature QC + Evidence Retrieval (Agents 2–3)** — Two parallel Tavily searches retrieve real papers. Semantic Scholar classifies novelty deterministically. Literature QC filters by relevance, recency, and methodology match.
4. **Planner (Agent 4)** — Generates the full experiment plan: objective, materials, protocol, controls, failure modes, statistical analysis, and timeline. Every claim references a retrieved source DOI.
5. **Internal QA Critic (Agent 5)** — Scores the plan (0–100). Requires confidence ≥ 70 and zero blockers to release. Gate is enforced server-side — the plan cannot be delivered if it fails.
6. **Expert Feedback Memory** — Scientists annotate and correct plans. Corrections are stored and retrieved by cosine similarity, injected as few-shot examples into future pipeline runs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Framework | Next.js 16 (App Router) |
| AI Agents | Anthropic Claude claude-sonnet-4-5 × 5 agents |
| Streaming | Server-Sent Events (SSE) |
| Evidence Retrieval | Tavily Search API (2 parallel searches per run) |
| Novelty Classification | Semantic Scholar API (deterministic, no LLM) |
| Schema Validation | Zod (every agent I/O boundary) |
| Storage | Prisma ORM + SQLite (dev) / libSQL Turso (prod) |
| Deployment | Vercel |

## Local Development

```bash
npm run dev          # localhost:3000
npm run build
npm run lint
npm run db:init      # baseline or apply migrations to dev.db
npm run db:migrate   # apply new migrations
npm run db:generate  # regenerate Prisma client
```

---

*Built for Hack-Nation × World Bank Youth Summit 2026 · Challenge 04: The AI Scientist · Fulcrum Science*
