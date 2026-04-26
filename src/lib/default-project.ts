import { db } from "./db";

let cached: string | null = null;

export async function getDefaultProjectId(): Promise<string> {
  if (cached) return cached;
  let project = await db.project.findFirst();
  if (!project) {
    project = await db.project.create({
      data: { name: "Operon AI", description: "The AI Scientist" },
    });
  }
  cached = project.id;
  return cached;
}
