// Created: 2026-04-29

import type { PlanningBrief } from "./intake-types";
import type { AppliedFeedbackTrace } from "./review-types";
import type { ExperimentPlan } from "./types";
import type { CriticSummary, LiteratureQcSummary } from "./workflow-types";

interface PlanExportPayload {
  hypothesis: string;
  plan: ExperimentPlan;
  planningBrief: PlanningBrief | null;
  qc: LiteratureQcSummary | null;
  critic: CriticSummary | null;
  qualityNote: string | null;
  appliedFeedback: AppliedFeedbackTrace[];
}

function bulletList(values: string[]) {
  if (values.length === 0) {
    return "- None";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function bulletListHtml(values: string[]) {
  if (values.length === 0) {
    return "<li>None</li>";
  }

  return values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "operon-plan";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value: string) {
  return escapeHtml(value);
}

function getExportBasename(plan: ExperimentPlan) {
  return `${sanitizeFilename(plan.title)}-${plan.generatedAt}`;
}

function compactSummary(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

function buildExportObject({
  hypothesis,
  plan,
  planningBrief,
  qc,
  critic,
  qualityNote,
  appliedFeedback,
}: PlanExportPayload) {
  return {
    title: plan.title,
    generatedAt: plan.generatedAt,
    hypothesis,
    summary: plan.summary,
    currency: plan.currency,
    totalBudgetEstimate: plan.totalBudgetEstimate,
    planningBrief,
    literatureQc: qc,
    internalQa: critic,
    qualityNote,
    appliedFeedback,
    plan,
  };
}

function excelStringCell(value: string) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function excelNumberCell(value: number) {
  return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
}

function excelRow(values: Array<string | number>) {
  const cells = values
    .map((value) => (typeof value === "number" ? excelNumberCell(value) : excelStringCell(value)))
    .join("");

  return `<Row>${cells}</Row>`;
}

function excelWorksheet(name: string, rows: Array<Array<string | number>>) {
  return [
    `<Worksheet ss:Name="${escapeXml(name)}">`,
    "<Table>",
    rows.map((row) => excelRow(row)).join(""),
    "</Table>",
    "</Worksheet>",
  ].join("");
}

export function buildPlanExportFilename(
  plan: ExperimentPlan,
  extension: "md" | "json" | "xls" | "pdf" = "md",
) {
  return `${getExportBasename(plan)}.${extension}`;
}

export function buildPlanExportMarkdown({
  hypothesis,
  plan,
  planningBrief,
  qc,
  critic,
  qualityNote,
  appliedFeedback,
}: PlanExportPayload) {
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

export function buildPlanExportJson(payload: PlanExportPayload) {
  return `${JSON.stringify(buildExportObject(payload), null, 2)}\n`;
}

export function buildPlanExportExcel(payload: PlanExportPayload) {
  const { hypothesis, plan, planningBrief, qc, critic, qualityNote, appliedFeedback } = payload;
  const worksheets = [
    excelWorksheet("Overview", [
      ["Title", plan.title],
      ["Generated", plan.generatedAt],
      ["Hypothesis", hypothesis],
      ["Summary", compactSummary(plan.summary)],
      ["Currency", plan.currency],
      ["Total Budget Estimate", plan.totalBudgetEstimate],
      ["Validation Approach", compactSummary(plan.validationApproach)],
      ["Quality Note", qualityNote ?? ""],
      ["Novelty Signal", qc?.noveltySignal ?? ""],
      ["Novelty Rationale", qc?.rationale ?? ""],
      ["Internal QA Score", critic?.confidenceScore ?? ""],
      ["Internal QA Approved", critic ? (critic.approved ? "Yes" : "No") : ""],
      ["Internal QA Summary", critic?.summary ?? ""],
    ]),
    excelWorksheet("Planning Brief", [
      ["Field", "Value"],
      ["Intervention", planningBrief?.intervention ?? ""],
      ["Model System", planningBrief?.modelSystem ?? ""],
      ["Primary Endpoint", planningBrief?.primaryEndpoint ?? ""],
      ["Comparator", planningBrief?.comparator ?? ""],
      ["Threshold", planningBrief?.threshold ?? ""],
      ["Mechanism", planningBrief?.mechanism ?? ""],
      ["Domain Hint", planningBrief?.domainHint ?? ""],
      ["Claim Constraints", planningBrief?.claimConstraints.join(" | ") ?? ""],
      ["Confirmed Assumptions", planningBrief?.confirmedAssumptions.join(" | ") ?? ""],
    ]),
    excelWorksheet("Protocol", [
      ["Step", "Title", "Description", "Duration", "Source Protocol", "Source URL", "Critical Note"],
      ...plan.protocol.map((step) => [
        step.stepNumber,
        step.title,
        step.description,
        step.duration,
        step.sourceProtocol ?? "",
        step.sourceUrl ?? "",
        step.criticalNote ?? "",
      ]),
    ]),
    excelWorksheet("Materials", [
      ["Name", "Supplier", "Catalog Number", "Quantity", "Unit Cost", "Total Cost", "Notes"],
      ...plan.materials.map((material) => [
        material.name,
        material.supplier,
        material.catalogNumber,
        material.quantity,
        material.unitCost,
        material.totalCost,
        material.notes ?? "",
      ]),
    ]),
    excelWorksheet("Budget", [
      ["Category", "Item", "Cost", "Currency", "Notes"],
      ...plan.budget.map((line) => [
        line.category,
        line.item,
        line.cost,
        line.currency,
        line.notes ?? "",
      ]),
      ["TOTAL", "", plan.totalBudgetEstimate, plan.currency, ""],
    ]),
    excelWorksheet("Timeline", [
      ["Phase", "Title", "Duration", "Dependencies", "Milestones"],
      ...plan.timeline.map((phase) => [
        phase.phase,
        phase.title,
        phase.duration,
        phase.dependencies.join(" | "),
        phase.milestones.join(" | "),
      ]),
    ]),
    excelWorksheet("Failure Modes", [
      ["Title", "Why It Fails", "Signal To Watch", "Mitigation", "Source Title", "Source URL"],
      ...plan.failureModes.map((mode) => [
        mode.title,
        mode.whyItFails,
        mode.signalToWatch,
        mode.mitigation,
        mode.sourceTitle,
        mode.sourceUrl,
      ]),
    ]),
    excelWorksheet("Sources", [
      ["Type", "Title", "URL"],
      ...plan.sources.map((source) => [source.type, source.title, source.url]),
    ]),
    excelWorksheet("Applied Feedback", [
      ["Section", "Original Text", "Corrected Text", "Reason", "Source Hypothesis"],
      ...appliedFeedback.map((feedback) => [
        feedback.section,
        feedback.originalText,
        feedback.correctedText,
        feedback.reason,
        feedback.sourceHypothesis,
      ]),
    ]),
  ];

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    "<DocumentProperties xmlns=\"urn:schemas-microsoft-com:office:office\">",
    `<Author>Operon AI</Author>`,
    `<Created>${escapeXml(plan.generatedAt)}</Created>`,
    "</DocumentProperties>",
    worksheets.join(""),
    "</Workbook>",
  ].join("");
}

export function buildPlanExportPrintHtml({
  hypothesis,
  plan,
  planningBrief,
  qc,
  critic,
  qualityNote,
  appliedFeedback,
}: PlanExportPayload) {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    `<title>${escapeHtml(plan.title)} - Operon AI Export</title>`,
    '<meta charset="utf-8" />',
    "<style>",
    "body { font-family: Georgia, 'Times New Roman', serif; color: #111827; margin: 32px; line-height: 1.5; }",
    "h1, h2, h3 { color: #0f172a; margin-bottom: 0.4rem; }",
    "h1 { font-size: 28px; }",
    "h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }",
    "h3 { font-size: 14px; margin-top: 18px; }",
    "p, li { font-size: 12px; }",
    "ul { margin: 8px 0 0 18px; padding: 0; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }",
    "th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; text-align: left; }",
    "th { background: #f8fafc; }",
    ".meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }",
    ".card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #ffffff; }",
    "@media print { body { margin: 18px; } .page-break { page-break-before: always; } }",
    "</style>",
    "</head>",
    "<body>",
    `<h1>${escapeHtml(plan.title)}</h1>`,
    `<p><strong>Generated:</strong> ${escapeHtml(plan.generatedAt)}<br /><strong>Budget:</strong> ${escapeHtml(formatCurrency(plan.totalBudgetEstimate, plan.currency))}</p>`,
    `<h2>Summary</h2><p>${escapeHtml(plan.summary)}</p>`,
    `<h2>Hypothesis</h2><p>${escapeHtml(hypothesis)}</p>`,
    planningBrief
      ? [
          "<h2>Confirmed Intake Brief</h2>",
          '<div class="meta">',
          `<div class="card"><strong>Intervention</strong><p>${escapeHtml(planningBrief.intervention)}</p></div>`,
          `<div class="card"><strong>Model System</strong><p>${escapeHtml(planningBrief.modelSystem)}</p></div>`,
          `<div class="card"><strong>Primary Endpoint</strong><p>${escapeHtml(planningBrief.primaryEndpoint)}</p></div>`,
          `<div class="card"><strong>Comparator</strong><p>${escapeHtml(planningBrief.comparator)}</p></div>`,
          planningBrief.threshold
            ? `<div class="card"><strong>Threshold</strong><p>${escapeHtml(planningBrief.threshold)}</p></div>`
            : "",
          planningBrief.mechanism
            ? `<div class="card"><strong>Mechanism</strong><p>${escapeHtml(planningBrief.mechanism)}</p></div>`
            : "",
          "</div>",
          planningBrief.claimConstraints.length > 0
            ? `<h3>Claim Constraints</h3><ul>${bulletListHtml(planningBrief.claimConstraints)}</ul>`
            : "",
          planningBrief.confirmedAssumptions.length > 0
            ? `<h3>Confirmed Assumptions</h3><ul>${bulletListHtml(planningBrief.confirmedAssumptions)}</ul>`
            : "",
        ]
          .filter(Boolean)
          .join("")
      : "",
    qc
      ? `<h2>Literature QC</h2><p><strong>Novelty:</strong> ${escapeHtml(qc.noveltySignal)}<br /><strong>Rationale:</strong> ${escapeHtml(qc.rationale)}</p>`
      : "",
    critic
      ? [
          "<h2>Internal QA</h2>",
          `<p><strong>Score:</strong> ${critic.confidenceScore}/100<br /><strong>Approved:</strong> ${critic.approved ? "Yes" : "No"}<br /><strong>Summary:</strong> ${escapeHtml(critic.summary)}</p>`,
          critic.warnings.length > 0 ? `<h3>Warnings</h3><ul>${bulletListHtml(critic.warnings)}</ul>` : "",
        ]
          .filter(Boolean)
          .join("")
      : "",
    qualityNote ? `<h2>Quality Note</h2><p>${escapeHtml(qualityNote)}</p>` : "",
    "<h2>Protocol</h2>",
    plan.protocol
      .map(
        (step) =>
          [
            `<h3>Step ${step.stepNumber} — ${escapeHtml(step.title)}</h3>`,
            `<p>${escapeHtml(step.description)}</p>`,
            `<p><strong>Duration:</strong> ${escapeHtml(step.duration)}</p>`,
            step.sourceProtocol ? `<p><strong>Source protocol:</strong> ${escapeHtml(step.sourceProtocol)}</p>` : "",
            step.sourceUrl ? `<p><strong>Source URL:</strong> ${escapeHtml(step.sourceUrl)}</p>` : "",
            step.criticalNote ? `<p><strong>Critical note:</strong> ${escapeHtml(step.criticalNote)}</p>` : "",
          ]
            .filter(Boolean)
            .join(""),
      )
      .join(""),
    "<div class=\"page-break\"></div>",
    "<h2>Materials</h2>",
    "<table><thead><tr><th>Name</th><th>Supplier</th><th>Catalog</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th><th>Notes</th></tr></thead><tbody>",
    plan.materials
      .map(
        (material) =>
          `<tr><td>${escapeHtml(material.name)}</td><td>${escapeHtml(material.supplier)}</td><td>${escapeHtml(material.catalogNumber)}</td><td>${escapeHtml(material.quantity)}</td><td>${escapeHtml(formatCurrency(material.unitCost, plan.currency))}</td><td>${escapeHtml(formatCurrency(material.totalCost, plan.currency))}</td><td>${escapeHtml(material.notes ?? "")}</td></tr>`,
      )
      .join(""),
    "</tbody></table>",
    "<h2>Budget</h2>",
    "<table><thead><tr><th>Category</th><th>Item</th><th>Cost</th><th>Notes</th></tr></thead><tbody>",
    plan.budget
      .map(
        (line) =>
          `<tr><td>${escapeHtml(line.category)}</td><td>${escapeHtml(line.item)}</td><td>${escapeHtml(formatCurrency(line.cost, line.currency))}</td><td>${escapeHtml(line.notes ?? "")}</td></tr>`,
      )
      .join(""),
    `</tbody></table><p><strong>Total:</strong> ${escapeHtml(formatCurrency(plan.totalBudgetEstimate, plan.currency))}</p>`,
    "<h2>Timeline</h2>",
    plan.timeline
      .map(
        (phase) =>
          `<div class="card"><h3>Phase ${phase.phase} — ${escapeHtml(phase.title)}</h3><p><strong>Duration:</strong> ${escapeHtml(phase.duration)}</p><p><strong>Dependencies</strong></p><ul>${bulletListHtml(phase.dependencies)}</ul><p><strong>Milestones</strong></p><ul>${bulletListHtml(phase.milestones)}</ul></div>`,
      )
      .join(""),
    `<h2>Validation Approach</h2><p>${escapeHtml(plan.validationApproach)}</p>`,
    plan.failureModes.length > 0
      ? [
          "<h2>Failure Modes</h2>",
          ...plan.failureModes.map(
            (mode) =>
              `<div class="card"><h3>${escapeHtml(mode.title)}</h3><p><strong>Why it fails:</strong> ${escapeHtml(mode.whyItFails)}</p><p><strong>Signal to watch:</strong> ${escapeHtml(mode.signalToWatch)}</p><p><strong>Mitigation:</strong> ${escapeHtml(mode.mitigation)}</p><p><strong>Source:</strong> ${escapeHtml(mode.sourceTitle)} — ${escapeHtml(mode.sourceUrl)}</p></div>`,
          ),
        ].join("")
      : "",
    appliedFeedback.length > 0
      ? [
          "<h2>Applied Prior Scientist Corrections</h2>",
          ...appliedFeedback.map(
            (feedback) =>
              `<div class="card"><h3>${escapeHtml(feedback.section)}</h3><p><strong>Applied correction:</strong> ${escapeHtml(feedback.correctedText)}</p><p><strong>Reason:</strong> ${escapeHtml(feedback.reason)}</p><p><strong>Source hypothesis:</strong> ${escapeHtml(feedback.sourceHypothesis)}</p></div>`,
          ),
        ].join("")
      : "",
    "<h2>Sources</h2>",
    "<ul>",
    plan.sources
      .map(
        (source) =>
          `<li>${escapeHtml(source.type)} — <a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a></li>`,
      )
      .join(""),
    "</ul>",
    "</body>",
    "</html>",
  ].join("");
}
