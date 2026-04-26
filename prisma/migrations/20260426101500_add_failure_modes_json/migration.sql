-- Created: 2026-04-26

ALTER TABLE "PlanPreview" ADD COLUMN "failureModesJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "ExperimentPlan" ADD COLUMN "failureModesJson" TEXT NOT NULL DEFAULT '[]';
