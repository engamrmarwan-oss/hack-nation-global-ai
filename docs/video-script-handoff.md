<!-- Created: 2026-04-26 -->

# Video Script Handoff Prompts

Use these prompts with ChatGPT or Claude to generate the final spoken scripts for:

- the **product demo video**
- the **technical review video**

These prompts are designed to keep the external model anchored to the **current Operon AI build** and to stop it from drifting into stale product states or made-up capabilities.

---

## Master Prompt For Both Videos

Paste this if you want one response that creates **both scripts together**:

```text
You are helping me write two final hackathon video scripts for my project, Operon AI.

I need:
1. a product demo video script for the tool itself
2. a technical review video script for the architecture and implementation

This is for a hackathon judging context, so accuracy matters more than hype. Do not invent features, do not generalize into startup fluff, and do not rewrite the product strategy. Base everything on the current project state below.

PROJECT NAME
Operon AI

ONE-LINE DESCRIPTION
Operon AI is a scientific planning copilot that turns a research idea into a grounded, lab-executable experiment plan.

CURRENT PRODUCT REALITY
- Operon AI uses a backend-managed conversational intake, not a plain textarea.
- The intake chat gathers a sufficient planning brief before planning starts.
- The core required planning inputs are intervention, model system, primary endpoint, and comparator.
- The pipeline then runs question profiling, literature QC, evidence retrieval, planning, and hidden internal QA before the user sees the final draft.
- Literature QC uses Semantic Scholar plus Tavily-backed retrieval.
- The plan is rendered as structured tabs including protocol, materials, budget, timeline, validation, failure modes, and sources.
- The app now has a persistent scientist feedback loop:
  - a collapsed review chat bubble on the full plan page
  - natural-language scientist corrections are extracted into structured corrections
  - those corrections are stored in the database
  - future similar runs can reuse them automatically
  - the next plan can show an applied prior corrections trace

IMPORTANT ACCURACY RULES
- Do not say the model is fine-tuned unless explicitly stated. It is not.
- Do not claim the system scientifically proves or disproves a hypothesis.
- Do not present novelty QC as deep semantic literature understanding; it is a grounded QC layer over retrieved evidence.
- Do not say the user is blocked by a scientific hypothesis critique. That is not the current product logic.
- Do say that Operon AI uses structured schemas, hidden QA, and expert feedback reuse.

TECH STACK
- Next.js 16
- TypeScript
- Anthropic Claude
- Tavily
- Semantic Scholar
- Prisma
- SQLite

ARCHITECTURE STORY
- Backend-managed conversational intake builds a typed planning brief
- Confirmed planning brief enters a staged pipeline
- Pipeline is grounded with literature QC and retrieval before plan generation
- Major model outputs are structured and schema-validated
- Internal QA and repair happen before the plan is shown
- Structured scientist feedback is persisted and reused for future similar experiments

REFERENCE MATERIAL TO USE
Use the following as the source of truth when writing:
- README.md
- docs/demo-script.md
- docs/technical-showcase.md
- docs/decisions.md

OUTPUT FORMAT
Give me two separate sections:

SECTION 1: PRODUCT DEMO VIDEO SCRIPT
Requirements:
- target length: 2.5 to 3 minutes
- audience: hackathon judges
- show the value of the tool itself
- time-coded in short segments
- each segment must include:
  - what I say
  - what I show on screen
- the script should feel smooth, confident, and specific
- emphasize the flow:
  - dashboard
  - conversational intake
  - pipeline progress
  - full plan output
  - scientist feedback chat / reuse story
- include a strong opening hook and closing line

SECTION 2: TECHNICAL REVIEW VIDEO SCRIPT
Requirements:
- target length: 3.5 to 5 minutes
- audience: technical reviewers and judges
- show the system architecture and implementation logic
- time-coded in short segments
- each segment must include:
  - what I say
  - what visual or diagram should be on screen
- structure it around:
  - what Operon AI is
  - architecture overview
  - backend conversational intake
  - grounded planning pipeline
  - structured output validation
  - hidden internal QA
  - persistent feedback loop
  - data model / persistence
  - limitations and scaling path
- keep the explanations technically strong but easy to follow aloud

STYLE
- Write for spoken delivery, not for reading silently.
- Use short spoken sentences.
- Avoid buzzwords unless they are technically justified.
- Make the scripts sound polished, but natural.
- Keep claims credible and tied to the actual implementation.

FINAL REQUIREMENT
Before the scripts, give me a short “strategy note” with:
- the core story of the product demo
- the core story of the technical review
- the biggest risk to avoid in each script
```

---

## Split Prompt: Product Demo Video

Paste this if you want only the product demo script:

```text
Help me write a final product demo video script for my hackathon project, Operon AI.

Project summary:
Operon AI is a scientific planning copilot that turns a research idea into a grounded, lab-executable experiment plan.

Current product flow:
- backend-managed conversational intake chat
- sufficient planning brief before planning
- pipeline with question profiling, literature QC, evidence retrieval, planner, and hidden internal QA
- structured final plan with protocol, materials, budget, timeline, validation, failure modes, and sources
- persistent scientist review chat that stores structured corrections and can influence future similar plans

Important accuracy constraints:
- do not claim fine-tuning
- do not claim scientific truth verification
- do not describe the app as a generic chatbot
- do not mention stale features like hypothesis-health gating or blocked-by-hypothesis logic

Use these files as the source of truth:
- README.md
- docs/demo-script.md
- docs/technical-showcase.md

I need:
- a 2.5 to 3 minute script
- optimized for hackathon judges
- time-coded
- each beat must include:
  - what I say
  - what I show on screen

The story should emphasize:
- why this matters to scientists
- the conversational intake
- the guided pipeline
- the quality and structure of the final plan
- the scientist feedback loop as a differentiator

Please output:
1. a one-paragraph strategy summary
2. the full time-coded script
3. a short backup version if I need to compress it to 90 seconds
```

---

## Split Prompt: Technical Review Video

Paste this if you want only the technical video script:

```text
Help me write a final technical review video script for my hackathon project, Operon AI.

Project summary:
Operon AI is a scientific planning copilot that turns a research idea into a grounded, lab-executable experiment plan.

Current architecture reality:
- backend-managed conversational intake creates a typed planning brief
- planning brief requires intervention, model system, primary endpoint, and comparator before planning
- staged pipeline:
  - question profiler
  - literature QC
  - evidence retrieval
  - planner
  - hidden internal QA and repair
- model outputs are schema-validated and normalized before persistence
- plan results are persisted with Prisma + SQLite
- scientist corrections are captured through a backend review chat, stored as structured records, and reused in future similar runs

Important accuracy constraints:
- do not claim fine-tuning
- do not claim full semantic novelty reasoning
- do not claim the system proves a hypothesis is scientifically true
- do not drift into older product states

Use these files as the source of truth:
- docs/technical-showcase.md
- README.md
- docs/decisions.md

I need:
- a 3.5 to 5 minute technical script
- written for judges and technical reviewers
- time-coded
- each segment must include:
  - what I say
  - what visual should be on screen

The structure should cover:
- what Operon AI is
- architecture overview
- conversational intake and planning brief
- grounded planning pipeline
- structured outputs and validation
- hidden internal QA and repair
- persistent feedback reuse
- data model and persistence
- limitations and future scaling

Please output:
1. a short strategy note
2. the full time-coded script
3. a list of 5 exact phrases to avoid because they would overstate the implementation
```

---

## Recommended Usage Note

If you use Claude or ChatGPT for this:

- paste the **master prompt** first
- then attach or paste the current contents of:
  - [README.md](/Users/amrmarwan/Downloads/hack-nation-global-ai/README.md)
  - [docs/demo-script.md](/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/demo-script.md)
  - [docs/technical-showcase.md](/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/technical-showcase.md)
  - [docs/decisions.md](/Users/amrmarwan/Downloads/hack-nation-global-ai/docs/decisions.md)

Best follow-up message after the first draft:

```text
Now tighten this for spoken delivery. Make it sound like one confident founder speaking naturally on camera. Remove repetition, shorten long sentences, and keep every technical claim precise.
```
