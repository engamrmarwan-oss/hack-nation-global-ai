// Created: 2026-04-25

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ZodError, type ZodType } from "zod";
import { anthropic, MODEL } from "./anthropic";

type StructuredOutputOptions<TParsed, TResult = TParsed> = {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  schema: ZodType<TParsed>;
  normalize?: (value: TParsed) => TResult;
};

export class StructuredOutputError extends Error {
  readonly debugMessage: string;
  readonly issues: string[];
  readonly failureKind: "length_limit" | "validation";

  constructor({
    message,
    debugMessage,
    issues,
    failureKind,
  }: {
    message: string;
    debugMessage: string;
    issues: string[];
    failureKind: "length_limit" | "validation";
  }) {
    super(message);
    this.name = "StructuredOutputError";
    this.debugMessage = debugMessage;
    this.issues = issues;
    this.failureKind = failureKind;
  }
}

function formatValidationError(error: unknown) {
  const issues = extractValidationIssues(error);
  if (issues.length > 0) {
    return issues.join("; ");
  }

  if (error instanceof Error) return error.message;
  return String(error);
}

function clampForPrompt(text: string, maxLength = 6000) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...<truncated>`;
}

function extractValidationIssues(error: unknown): string[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);
  }

  if (!(error instanceof Error)) {
    return [];
  }

  const message = error.message;
  const validationSection = message.match(/Validation issues:\s*([\s\S]*)$/)?.[1];
  if (validationSection) {
    return validationSection
      .split(/\s+-\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function isLengthConstraintIssue(issue: string) {
  return /too big|<=\s*\d+\s*(characters|items)/i.test(issue);
}

function buildRepairInstructions(issues: string[]) {
  if (issues.length === 0) {
    return ["Return the same content again, but with STRICT schema adherence and shorter field text where possible."];
  }

  const targetedRules = issues
    .map((issue) => {
      const stringLimit = issue.match(/^([A-Za-z0-9_.[\]]+): .*<=\s*(\d+)\s*characters/i);
      if (stringLimit) {
        return `${stringLimit[1]} must be <= ${stringLimit[2]} characters.`;
      }

      const itemLimit = issue.match(/^([A-Za-z0-9_.[\]]+): .*<=\s*(\d+)\s*items/i);
      if (itemLimit) {
        return `${itemLimit[1]} must have <= ${itemLimit[2]} items.`;
      }

      return issue;
    })
    .filter(Boolean);

  return [
    "Return the same content again, but fix these schema violations exactly:",
    ...targetedRules.map((rule) => `- ${rule}`),
    "Do not expand other fields while repairing these constraints.",
  ];
}

async function callClaudeStructured<TParsed, TResult = TParsed>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  schema: ZodType<TParsed>,
  normalize?: (value: TParsed) => TResult,
): Promise<TResult> {
  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(schema),
    },
  });

  if (!message.parsed_output) {
    throw new Error("Claude returned no parsed structured output.");
  }

  return normalize
    ? normalize(message.parsed_output as TParsed)
    : (message.parsed_output as TResult);
}

export async function requestStructuredOutput<TParsed, TResult = TParsed>({
  systemPrompt,
  userMessage,
  maxTokens,
  schema,
  normalize,
}: StructuredOutputOptions<TParsed, TResult>): Promise<TResult> {
  try {
    return await callClaudeStructured(systemPrompt, userMessage, maxTokens, schema, normalize);
  } catch (firstError) {
    const issues = extractValidationIssues(firstError);
    const repairPrompt = [
      "Your previous response failed structured JSON validation.",
      `Original request:\n${userMessage}`,
      `Validation error:\n${formatValidationError(firstError)}`,
      ...buildRepairInstructions(issues),
      "Do not add prose, markdown, comments, or code fences.",
      "Keep descriptions concise so the full JSON fits comfortably within the token budget.",
    ].join("\n\n");

    try {
      return await callClaudeStructured(
        systemPrompt,
        clampForPrompt(repairPrompt),
        maxTokens,
        schema,
        normalize,
      );
    } catch (repairError) {
      const finalIssues = Array.from(
        new Set([...issues, ...extractValidationIssues(repairError)]),
      );
      const failureKind =
        finalIssues.length > 0 && finalIssues.every(isLengthConstraintIssue)
          ? "length_limit"
          : "validation";
      const debugMessage = [
        "Failed to produce valid structured JSON after one repair retry.",
        `Initial error: ${formatValidationError(firstError)}`,
        `Repair error: ${formatValidationError(repairError)}`,
      ].join(" ");

      throw new StructuredOutputError({
        message:
          failureKind === "length_limit"
            ? "The model response exceeded structured output limits and could not be repaired automatically."
            : "The model response could not be validated after one repair retry.",
        debugMessage,
        issues: finalIssues,
        failureKind,
      });
    }
  }
}
