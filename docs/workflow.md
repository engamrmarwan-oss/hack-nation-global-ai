# Workflow Guide — How AI Tools Use This Repo Without Conflicting

> Read this once before the hackathon starts. It's short.

---

## The Rule

**GitHub is the single source of truth. Every AI agent reads from it, writes to it, never to memory alone.**

If it's not in the repo, it doesn't exist.

---

## Which AI Does What

| Tool | Reads | Writes | Never touches |
|------|-------|--------|---------------|
| **Codex** (Builder) | docs/context.md, docs/architecture.md, docs/decisions.md | src/, tests/, scripts/ | docs/, prompts/, assets/ |
| **Claude** (Architect) | docs/context.md, docs/decisions.md, src/ (for review) | docs/architecture.md, docs/decisions.md | src/ (only advises, doesn't write code) |
| **Claude Chrome** (Research/Pitch) | docs/context.md, docs/architecture.md | docs/challenge-notes.md, docs/pitch.md, docs/submission.md, docs/demo-script.md, README.md | src/, tests/ |

---

## The 3-Laptop Rule

Only **one laptop** is the main coding machine. The others are reference/support only.

- **Laptop 1 (Main):** Codex running, VS Code open, git push/pull from here only.
- **Laptop 2 (Docs):** Claude Chrome open, updating docs/, pitch, research.
- **Laptop 3 (Architect):** Claude open, reviewing architecture, answering questions.

**Avoid simultaneous git commits from multiple machines. Push and pull before switching.**

---

## Hackathon Checkpoint Workflow

Use these commit messages at each checkpoint to mark progress:

```bash
# Hour 0 — Repo ready, challenge received
git commit -m "checkpoint: H0 — repo initialized, waiting for challenge"

# Hour 1 — Challenge analyzed, project selected
git commit -m "checkpoint: H1 — challenge analyzed, [PROJECT NAME] selected"

# Hour 2 — Architecture decided, stack confirmed
git commit -m "checkpoint: H2 — architecture finalized, tech stack locked"

# Hour 4 — Core scaffold built
git commit -m "checkpoint: H4 — project scaffold up, core modules stubbed"

# Hour 6 — First working prototype
git commit -m "checkpoint: H6 — first end-to-end prototype working"

# Hour 10 — MVP functional
git commit -m "checkpoint: H10 — MVP complete, all core features working"

# Hour 14 — Demo-ready version
git commit -m "checkpoint: H14 — demo-ready, happy path tested"

# Hour 18 — Pitch + README complete
git commit -m "checkpoint: H18 — pitch written, README updated, submission drafted"

# Hour 22 — Final polish
git commit -m "checkpoint: H22 — final polish, demo video recorded"

# Hour 24 — Submitted
git commit -m "checkpoint: H24 — SUBMITTED"
```

---

## Session Start Checklist (do this every time you open a new AI session)

1. `git pull` on main coding laptop
2. Open docs/context.md — read the current status section
3. Load the correct prompt file for the AI you're using (prompts/)
4. Tell the AI: "Read docs/context.md before starting"
5. Start working

## Session End Checklist (do this every time you close an AI session)

1. Commit everything: `git add -A && git commit -m "wip: [what you did]"`
2. Push: `git push origin main`
3. Update docs/context.md status checkboxes
4. Note any blockers or next steps in docs/decisions.md

---

## Conflict Prevention Rules

1. **Codex never edits docs/.** If Codex suggests a docs change, you paste it manually.
2. **Claude Chrome never edits src/.** Architecture changes go through Claude first.
3. **Never reopen a decision in docs/decisions.md** without explicit human approval.
4. **One tool at a time on any given file.** Don't have two AI sessions editing README simultaneously.
5. **When in doubt, ask Claude (Architect)** — scope is more dangerous than bugs.

---

## Emergency Protocol (if things go wrong)

- Demo broken 2 hours before deadline: **Drop all features, focus on making the simplest possible thing work.**
- Architecture fundamentally wrong: **Talk to Claude immediately. Cut scope before refactoring.**
- Lost track of what's done: **Read docs/context.md status section + git log --oneline.**
- Merge conflicts: **On main coding laptop, `git checkout --theirs .` for docs, `git checkout --ours .` for src.**
