-- Created: 2026-04-26

ALTER TABLE "PlanPreview" ADD COLUMN "appliedFeedbackJson" TEXT NOT NULL DEFAULT '[]';

CREATE TABLE "ScientistReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainHint" TEXT,
    "experimentClass" TEXT,
    "interventionText" TEXT,
    "endpointText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    CONSTRAINT "ScientistReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScientistReview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ResearchQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScientistReview_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "PlanPreview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScientistCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "section" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewId" TEXT NOT NULL,
    CONSTRAINT "ScientistCorrection_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ScientistReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ScientistReview_projectId_createdAt_idx" ON "ScientistReview"("projectId", "createdAt");
CREATE INDEX "ScientistReview_questionId_createdAt_idx" ON "ScientistReview"("questionId", "createdAt");
CREATE INDEX "ScientistReview_experimentClass_domainHint_createdAt_idx" ON "ScientistReview"("experimentClass", "domainHint", "createdAt");
CREATE INDEX "ScientistCorrection_reviewId_createdAt_idx" ON "ScientistCorrection"("reviewId", "createdAt");
CREATE INDEX "ScientistCorrection_section_createdAt_idx" ON "ScientistCorrection"("section", "createdAt");
