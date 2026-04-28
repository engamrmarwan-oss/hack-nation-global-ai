// Created: 2026-04-29

import type { PlanningBrief } from "./intake-types";
import type { AppliedFeedbackTrace } from "./review-types";
import type { ExperimentPlan } from "./types";
import type { CriticSummary, LiteratureQcSummary } from "./workflow-types";

function bulletList(values: string[]) {
  if (values.length === 0) {
    return "- None";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "operon-plan";
}

export function buildPlanExportFilename(plan: ExperimentPlan) {
  return `${sanitizeFilename(plan.title)}-${plan.generatedAt}.md`;
}

export function buildPlanExportMarkdown({
  hypothesis,
  plan,
  planningBrief,
  qc,
  critic,
  qualityNote,
  appliedFeedback,
}: {
  hypothesis: string;
  plan: ExperimentPlan;
  planningBrief: PlanningBrief | null;
  qc: LiteratureQcSummary | null;
  critic: CriticSummary | null;
  qualityNote: string | null;
  appliedFeedback: AppliedFeedbackTrace[];
}) {
  const sections: string[] = [];

  sections.push(`# ${plan.title}`);
  sections.push(`Generated: ${plan.generatedAt}`);
  sections.push(`Currency: ${plan.currency}`);
  sections.push(`Total budget estimate: ${plan.currency} ${plan.totalBudgetEstimate.toLocaleString()}`);

  sections.push(`## Summary\n${plan.summary}`);
  sections.push(`## Hypothesis\n${hypothesis}`);

  if (planningBrief) {
    sections.push(
      [
        "## Confirmed Intake Brief",
        `- Intervention: ${planningBrief.intervention}`,
        `- Model system: ${planningBrief.modelSystem}`,
        `- Primary endpoint: ${planningBrief.primaryEndpoint}`,
        `- Comparator: ${planningBrief.comparator}`,
        planningBrief.threshold ? `- Threshold: ${planningBrief.threshold}` : "",
        planningBrief.mechanism ? `- Mechanism: ${planningBrief.mechanism}` : "",
        planningBrief.domainHint ? `- Domain hint: ${planningBrief.domainHint}` : "",
        planningBrief.claimConstraints.length > 0
          ? `- Claim constraints:\n${bulletList(planningBrief.claimConstraints)}`
          : "",
        planningBrief.confirmedAssumptions.length > 0
          ? `- Confirmed assumptions:\n${bulletList(planningBrief.confirmedAssumptions)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (qc) {
    sections.push(
      [
        "## Literature QC",
        `- Novelty signal: ${qc.noveltySignal}`,
        `- Search query: ${qc.searchQuery}`,
        `- Reference count: ${qc.referenceCount}`,
        `- Rationale: ${qc.rationale}`,
      ].join("\n"),
    );
  }

  if (critic) {
    sections.push(
      [
        "## Internal QA",
        `- Score: ${critic.confidenceScore}/100`,
        `- Approved: ${critic.approved ? "Yes" : "No"}`,
        `- Summary: ${critic.summary}`,
        critic.warnings.length > 0 ? `### Warnings\n${bulletList(critic.warnings)}` : "",
        critic.blockers.length > 0 ? `### Blockers\n${bulletList(critic.blockers)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (qualityNote) {
    sections.push(`## Quality Note\n${qualityNote}`);
  }

  sections.push(
    [
      "## Protocol",
      ...plan.protocol.map((step) =>
        [
          `### Step ${step.stepNumber} — ${step.title}`,
          step.description,
          `- Duration: ${step.duration}`,
          step.sourceProtocol ? `- Source protocol: ${step.sourceProtocol}` : "",
          step.sourceUrl ? `- Source URL: ${step.sourceUrl}` : "",
          step.criticalNote ? `- Critical note: ${step.criticalNote}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Materials",
      ...plan.materials.map((material) =>
        [
          `### ${material.name}`,
          `- Supplier: ${material.supplier}`,
          `- Catalog number: ${material.catalogNumber}`,
          `- Quantity: ${material.quantity}`,
          `- Unit cost: ${plan.currency} ${material.unitCost.toLocaleString()}`,
          `- Total cost: ${plan.currency} ${material.totalCost.toLocaleString()}`,
          material.notes ? `- Notes: ${material.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Budget",
      ...plan.budget.map((line) =>
        [
          `### ${line.category} — ${line.item}`,
          `- Cost: ${line.currency} ${line.cost.toLocaleString()}`,
          line.notes ? `- Notes: ${line.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      `### Total\n- ${plan.currency} ${plan.totalBudgetEstimate.toLocaleString()}`,
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Timeline",
      ...plan.timeline.map((phase) =>
        [
          `### Phase ${phase.phase} — ${phase.title}`,
          `- Duration: ${phase.duration}`,
          `- Dependencies:\n${bulletList(phase.dependencies)}`,
          `- Milestones:\n${bulletList(phase.milestones)}`,
        ].join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(`## Validation Approach\n${plan.validationApproach}`);

  if (plan.failureModes.length > 0) {
    sections.push(
      [
        "## Failure Modes",
        ...plan.failureModes.map((mode) =>
          [
            `### ${mode.title}`,
            `- Why it fails: ${mode.whyItFails}`,
            `- Signal to watch: ${mode.signalToWatch}`,
            `- Mitigation: ${mode.mitigation}`,
            `- Source title: ${mode.sourceTitle}`,
            `- Source URL: ${mode.sourceUrl}`,
          ].join("\n"),
        ),
      ].join("\n\n"),
    );
  }

  if (appliedFeedback.length > 0) {
    sections.push(
      [
        "## Applied Prior Scientist Corrections",
        ...appliedFeedback.map((feedback) =>
          [
            `### ${feedback.section}`,
            `- Original: ${feedback.originalText}`,
            `- Applied correction: ${feedback.correctedText}`,
            `- Reason: ${feedback.reason}`,
            `- Source hypothesis: ${feedback.sourceHypothesis}`,
          ].join("\n"),
        ),
      ].join("\n\n"),
    );
  }

  sections.push(
    [
      "## Sources",
      ...plan.sources.map((source) => `- [${source.type}] ${source.title} — ${source.url}`),
    ].join("\n"),
  );

  return `${sections.join("\n\n")}\n`;
}
