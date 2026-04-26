# docs/context.md — Master Context File
# READ THIS FIRST — All AI agents should load this file before starting work.

## Hackathon
- Name: Hack-Nation Global AI Hackathon
- Duration: 24 hours
- Participant: Solo

## Challenge
Build an AI-powered tool that takes a scientific question as input and generates a complete, operationally realistic experiment plan that a real lab could execute.

**Requirements source of truth:** `/Users/amrmarwan/Downloads/04_The_AI_Scientist.docx.md`
**Implementation audit + gap list:** see the "Implementation Audit" section at the bottom of [docs/challenge-notes.md](docs/challenge-notes.md)

## Selected Project
- **Project Name:** Operon AI
- **One-line Description:** Operon AI turns scientific questions into grounded, lab-executable experiment plans.
- **Core Problem Solved:** Converting a scientific idea into a runnable protocol is fragmented across papers, notes, sourcing, budgeting, and staffing.
- **Target User:** Researchers, lab operators, founders, and technically literate scientists who need a credible first experiment plan fast.

## Tech Stack
- **Language/Runtime:** TypeScript / Node.js
- **Key Libraries/Frameworks:** Next.js, Prisma
- **AI/ML Components:** OpenAI for generation in MVP, optional Ollama path later for sensitive workloads
- **APIs/Services Used:** Tavily for retrieval, Vercel for deployment

## Scope & Constraints
- Must be completable solo in under 24 hours.
- Demo must work end-to-end on the happy path.
- The app should look and feel newly built for the challenge, not like a rebranded old product.
- Reuse Crystal mechanisms, but expose only challenge-native terminology in the shipped product.
- Avoid stale local data, old branding, and unrelated historical assets.

## Sponsor Prizes to Target
- **Tavily:** Strong fit because grounded scientific retrieval and sourcing are central to the value proposition.
- **Vercel:** Strong fit because we need a stable, polished public deployment for judges.

## Key Decisions Made
See [docs/decisions.md](docs/decisions.md).

## Architecture Summary
See [docs/architecture.md](docs/architecture.md).

## Migration Bridge
See [docs/migration-context.md](docs/migration-context.md).

## AI Tool Roles
| Tool | Role | What It Touches |
|------|------|----------------|
| Codex | Builder | src/, tests/, scripts/, selected docs when explicitly requested |
| Claude | Architect/Critic | docs/, architecture, scope control |
| Claude Chrome | Research/Pitch | challenge notes, pitch, submission, presentation assets |

## Current Status
- [x] Challenge analyzed
- [x] Project direction selected
- [x] Crystal reuse strategy defined
- [x] Tavily and Vercel integrated into architecture plan
- [ ] Fresh Next.js scaffold landed
- [ ] Challenge-native data model landed
- [ ] MVP happy path working
- [ ] Demo recorded
- [ ] Submission text finalized
