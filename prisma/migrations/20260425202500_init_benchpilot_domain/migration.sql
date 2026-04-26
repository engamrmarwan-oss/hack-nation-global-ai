-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ResearchQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "objective" TEXT,
    "assumptionsJson" TEXT,
    "constraintsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "retrievalStatus" TEXT NOT NULL DEFAULT 'idle',
    "previewStatus" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ResearchQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "snippet" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'web',
    "provider" TEXT NOT NULL DEFAULT 'tavily',
    "relevanceScore" REAL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "EvidenceSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceSource_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ResearchQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanPreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "objective" TEXT,
    "hypothesis" TEXT,
    "protocolJson" TEXT NOT NULL,
    "controlsJson" TEXT NOT NULL,
    "materialsJson" TEXT NOT NULL,
    "budgetJson" TEXT NOT NULL,
    "staffingJson" TEXT NOT NULL,
    "risksJson" TEXT NOT NULL,
    "validationJson" TEXT NOT NULL,
    "evidenceSummaryJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "PlanPreview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanPreview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ResearchQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "objective" TEXT,
    "hypothesis" TEXT,
    "protocolJson" TEXT NOT NULL,
    "controlsJson" TEXT NOT NULL,
    "materialsJson" TEXT NOT NULL,
    "budgetJson" TEXT NOT NULL,
    "staffingJson" TEXT NOT NULL,
    "risksJson" TEXT NOT NULL,
    "validationJson" TEXT NOT NULL,
    "evidenceSummaryJson" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sourcePreviewId" TEXT NOT NULL,
    CONSTRAINT "ExperimentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentPlan_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ResearchQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentPlan_sourcePreviewId_fkey" FOREIGN KEY ("sourcePreviewId") REFERENCES "PlanPreview" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanningRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "notes" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT,
    CONSTRAINT "PlanningRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanningRun_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ResearchQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResearchQuestion_projectId_createdAt_idx" ON "ResearchQuestion"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceSource_projectId_createdAt_idx" ON "EvidenceSource"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceSource_questionId_createdAt_idx" ON "EvidenceSource"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanPreview_projectId_status_createdAt_idx" ON "PlanPreview"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PlanPreview_questionId_status_createdAt_idx" ON "PlanPreview"("questionId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentPlan_sourcePreviewId_key" ON "ExperimentPlan"("sourcePreviewId");

-- CreateIndex
CREATE INDEX "ExperimentPlan_projectId_status_createdAt_idx" ON "ExperimentPlan"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExperimentPlan_questionId_status_createdAt_idx" ON "ExperimentPlan"("questionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PlanningRun_projectId_createdAt_idx" ON "PlanningRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanningRun_questionId_createdAt_idx" ON "PlanningRun"("questionId", "createdAt");
