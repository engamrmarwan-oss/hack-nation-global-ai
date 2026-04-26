import { requestStructuredOutput } from "../structured-output";
import {
  orchestratorOutputSchema,
  type QuestionProfile,
} from "../workflow-types";

const SYSTEM_PROMPT = `You are a scientific hypothesis parser. Extract structured fields from a natural language hypothesis.

Return ONLY valid JSON with this shape:
{
  "experimentClass": "in_vivo_biology" | "cell_biology" | "diagnostics" | "climate_biotech" | "general_experiment",
  "primaryObjective": "string",
  "primaryEndpoint": "string — the measurable outcome with threshold if stated",
  "intervention": "string — what is being done",
  "modelSystem": "string — organism, cell line, or system",
  "rationale": "string — the mechanistic reason given",
  "keyTerms": ["array", "of", "max", "8", "search", "terms"],
  "riskFlags": ["array of execution risks identified"],
  "isValid": true | false,
  "validationWarnings": ["issues: missing threshold, missing control, too vague, etc."]
}

A valid hypothesis must have: (1) a specific intervention, (2) a measurable outcome with a numeric threshold, (3) a control condition implied or stated. Flag missing elements in validationWarnings but still parse what you can.`;

export interface OrchestratorResult {
  profile: QuestionProfile;
  isValid: boolean;
  validationWarnings: string[];
}

export async function runOrchestrator(hypothesis: string): Promise<OrchestratorResult> {
  const parsed = await requestStructuredOutput({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: hypothesis,
    maxTokens: 1024,
    schema: orchestratorOutputSchema,
  });

  const { isValid, validationWarnings, ...profile } = parsed;
  return { profile, isValid: isValid ?? true, validationWarnings: validationWarnings ?? [] };
}
