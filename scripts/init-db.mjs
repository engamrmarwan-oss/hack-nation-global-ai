import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const initialMigrationName = "20260425202500_init_benchpilot_domain";
const domainTables = [
  "Project",
  "ResearchQuestion",
  "EvidenceSource",
  "PlanPreview",
  "ExperimentPlan",
  "PlanningRun",
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const prismaCliPath = resolve(repoRoot, "node_modules/prisma/build/index.js");

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }
}

async function readExistingTables() {
  const client = createClient({ url: databaseUrl });

  try {
    const result = await client.execute(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `);

    return new Set(result.rows.map((row) => String(row.name)));
  } finally {
    await client.close();
  }
}

async function main() {
  const existingTables = await readExistingTables();
  const existingDomainTables = domainTables.filter((table) => existingTables.has(table));
  const hasDomainData = existingDomainTables.length > 0;
  const hasFullDomainSchema = existingDomainTables.length === domainTables.length;
  const hasMigrationTable = existingTables.has("_prisma_migrations");

  if (hasDomainData && !hasFullDomainSchema) {
    throw new Error(
      `Found a partial Operon AI schema in ${databaseUrl}. Existing tables: ${existingDomainTables.join(
        ", ",
      )}. Refusing to guess how to repair it.`,
    );
  }

  if (!hasDomainData) {
    console.log(`No Operon AI tables found in ${databaseUrl}. Applying checked-in Prisma migrations.`);
    runPrisma(["migrate", "deploy"]);
    return;
  }

  if (!hasMigrationTable) {
    console.log(
      `Operon AI tables exist in ${databaseUrl} without Prisma migration history. Baselining the initial migration.`,
    );
    runPrisma(["migrate", "resolve", "--applied", initialMigrationName]);
  }

  console.log(`Ensuring ${databaseUrl} is up to date with checked-in Prisma migrations.`);
  runPrisma(["migrate", "deploy"]);
}

await main();
