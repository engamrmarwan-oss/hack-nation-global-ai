import postgres from 'postgres';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require' });
const data = JSON.parse(readFileSync(new URL('./seed_data.json', import.meta.url), 'utf8'));

function v(val) { return val === undefined ? null : val; }

async function run() {
  console.log('Seeding Neon database...');

  // 1. Project
  const p = data.project;
  await sql`
    INSERT INTO "Project" (id, name, description, status, "createdAt", "updatedAt")
    VALUES (${p.id}, ${p.name}, ${v(p.description)}, ${p.status}, ${p.createdAt}, ${p.updatedAt})
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('✅ Project inserted');

  // 2. Research Questions
  for (const q of data.questions) {
    await sql`
      INSERT INTO "ResearchQuestion" (
        id, title, question, objective, "assumptionsJson", status,
        "createdAt", "updatedAt", "projectId"
      ) VALUES (
        ${q.id}, ${q.title}, ${q.question}, ${v(q.objective)},
        ${v(q.assumptionsJson)}, ${v(q.status) ?? 'active'},
        ${q.createdAt}, ${q.updatedAt}, ${q.projectId}
      ) ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ ${data.questions.length} ResearchQuestions inserted`);

  // 3. Planning Runs
  for (const r of data.runs) {
    await sql`
      INSERT INTO "PlanningRun" (
        id, mode, status, stage, notes, error,
        "startedAt", "finishedAt", "createdAt", "updatedAt",
        "projectId", "questionId", "stageDataJson"
      ) VALUES (
        ${r.id}, ${v(r.mode) ?? 'full'}, ${r.status}, ${v(r.stage)},
        ${v(r.notes)}, ${v(r.error)},
        ${v(r.startedAt)}, ${v(r.finishedAt)}, ${r.createdAt}, ${r.updatedAt},
        ${r.projectId}, ${v(r.questionId)}, ${v(r.stageDataJson) ?? '{}'}
      ) ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ ${data.runs.length} PlanningRuns inserted`);

  // 4. Plan Previews
  for (const pv of data.previews) {
    await sql`
      INSERT INTO "PlanPreview" (
        id, title, status, "reviewStatus", summary, objective, hypothesis,
        "protocolJson", "controlsJson", "timelineJson", "materialsJson",
        "budgetJson", "staffingJson", "risksJson", "validationJson",
        "evidenceSummaryJson", "criticSummaryJson", "failureModesJson", "appliedFeedbackJson",
        "createdAt", "updatedAt", "appliedAt",
        "projectId", "questionId", "planningRunId"
      ) VALUES (
        ${pv.id}, ${v(pv.title)}, ${v(pv.status) ?? 'draft'}, ${v(pv.reviewStatus) ?? 'pending'},
        ${v(pv.summary)}, ${v(pv.objective)}, ${v(pv.hypothesis)},
        ${v(pv.protocolJson) ?? '[]'}, ${v(pv.controlsJson) ?? '[]'},
        ${v(pv.timelineJson) ?? '[]'}, ${v(pv.materialsJson) ?? '[]'},
        ${v(pv.budgetJson) ?? '[]'}, ${v(pv.staffingJson) ?? '[]'},
        ${v(pv.risksJson) ?? '[]'}, ${v(pv.validationJson) ?? '[]'},
        ${v(pv.evidenceSummaryJson) ?? '[]'}, ${v(pv.criticSummaryJson)},
        ${v(pv.failureModesJson) ?? '[]'}, ${v(pv.appliedFeedbackJson) ?? '[]'},
        ${pv.createdAt}, ${pv.updatedAt}, ${v(pv.appliedAt)},
        ${pv.projectId}, ${v(pv.questionId)}, ${v(pv.planningRunId)}
      ) ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ ${data.previews.length} PlanPreviews inserted`);

  // 5. Experiment Plans
  for (const ep of data.plans) {
    await sql`
      INSERT INTO "ExperimentPlan" (
        id, title, status, summary, objective, hypothesis,
        "protocolJson", "controlsJson", "timelineJson", "materialsJson",
        "budgetJson", "staffingJson", "risksJson", "validationJson",
        "evidenceSummaryJson", "failureModesJson",
        "createdAt", "updatedAt", "archivedAt",
        "projectId", "questionId", "sourcePreviewId"
      ) VALUES (
        ${ep.id}, ${v(ep.title)}, ${v(ep.status) ?? 'active'},
        ${v(ep.summary)}, ${v(ep.objective)}, ${v(ep.hypothesis)},
        ${v(ep.protocolJson) ?? '[]'}, ${v(ep.controlsJson) ?? '[]'},
        ${v(ep.timelineJson) ?? '[]'}, ${v(ep.materialsJson) ?? '[]'},
        ${v(ep.budgetJson) ?? '[]'}, ${v(ep.staffingJson) ?? '[]'},
        ${v(ep.risksJson) ?? '[]'}, ${v(ep.validationJson) ?? '[]'},
        ${v(ep.evidenceSummaryJson) ?? '[]'}, ${v(ep.failureModesJson) ?? '[]'},
        ${ep.createdAt}, ${ep.updatedAt}, ${v(ep.archivedAt)},
        ${ep.projectId}, ${v(ep.questionId)}, ${v(ep.sourcePreviewId)}
      ) ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ ${data.plans.length} ExperimentPlans inserted`);

  await sql.end();
  console.log('\n🎉 Migration complete — all experiments seeded into Neon.');
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
