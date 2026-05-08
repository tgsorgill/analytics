"use client";

import { buildAiPrompt, buildExtraAiPrompt, parseAiInsight } from "@/lib/promptBuilder";
import { protectStudentIdentifierMapping } from "@/lib/mapping";
import { inferStudentIdentifierRole } from "@/lib/privacy";
import type { AiInsight, AiRequest, ColumnInference, ColumnMapping, ExtraAiRequest, HeaderDerivation, InternalField } from "@/lib/types";
import { internalFields } from "@/lib/types";

export const defaultAiModel = "Qwen/Qwen2.5-7B-Instruct:fastest";
export const alternateAiModel = "Qwen/Qwen2.5-14B-Instruct:fastest";
export const configuredHfToken = process.env.NEXT_PUBLIC_HF_TOKEN?.trim() ?? "";

type HuggingFaceChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: string;
};

type AiColumnMappingRequest = {
  token: string;
  model?: string;
  inferences: ColumnInference[];
  fallbackMappings: ColumnMapping[];
};

type AiColumnRoleResponse = {
  columns?: {
    column?: string;
    role?: string;
    confidence?: number;
    headerDerivation?: string;
    reason?: string;
  }[];
  error?: string;
};

export async function requestAiInsight({ token, model, analytics, locale = "en" }: AiRequest): Promise<AiInsight> {
  const prompt = buildAiPrompt(analytics, locale);
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            locale === "mn"
              ? "You are a classroom analytics assistant for teachers, not an evaluator of children. Summarize aggregate findings only in natural Mongolian Cyrillic. Use teacher-friendly Mongolian phrases such as дундаж, ахиц, бууралт, анхаарах чиглэл, хязгаарлалт. Return valid JSON only, with no markdown and no text outside JSON. Do not act as a psychologist, doctor, IQ evaluator, disciplinary authority, future predictor, or automated decision-maker. Do not analyze individual students, infer traits, or make grading, placement, diagnosis, discipline, retention, or eligibility decisions."
              : "You are a classroom analytics assistant for teachers, not an evaluator of children. Summarize aggregate findings only. Return valid JSON only, with no markdown and no text outside JSON. Do not act as a psychologist, doctor, IQ evaluator, disciplinary authority, future predictor, or automated decision-maker. Do not analyze individual students, infer traits, or make grading, placement, diagnosis, discipline, retention, or eligibility decisions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as HuggingFaceChatResponse;

  if (!response.ok) {
    throw new Error(payload.error || `Hugging Face request failed with ${response.status}.`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Hugging Face returned an empty response.");
  }

  return parseAiInsight(text, locale);
}

export async function requestExtraAiInsight({ token, model, extraAnalytics, locale = "en" }: ExtraAiRequest): Promise<AiInsight> {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            locale === "mn"
              ? "You explain advanced aggregate classroom analytics for teachers in natural Mongolian Cyrillic. Return valid JSON only, with no markdown and no text outside JSON. You never diagnose, evaluate children, infer traits, predict futures, criticize teacher quality, assign blame, or make automated decisions."
              : "You explain advanced aggregate classroom analytics for teachers. Return valid JSON only, with no markdown and no text outside JSON. You never diagnose, evaluate children, infer traits, predict futures, criticize teacher quality, assign blame, or make automated decisions.",
        },
        {
          role: "user",
          content: buildExtraAiPrompt(extraAnalytics, locale),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as HuggingFaceChatResponse;
  if (!response.ok) {
    throw new Error(payload.error || `Hugging Face Extra summary failed with ${response.status}.`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Hugging Face returned an empty Extra response.");
  }

  return parseAiInsight(text, locale);
}

export async function requestAiColumnMappings({
  token,
  model = defaultAiModel,
  inferences,
  fallbackMappings,
}: AiColumnMappingRequest): Promise<ColumnMapping[]> {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You classify sanitized school spreadsheet column headers into data roles. You do not analyze students, evaluate children, compute statistics, make decisions, or inspect raw CSV rows.",
        },
        {
          role: "user",
          content: buildColumnMappingPrompt(inferences),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as HuggingFaceChatResponse;
  if (!response.ok) {
    throw new Error(payload.error || `Hugging Face schema mapping failed with ${response.status}.`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Hugging Face returned an empty schema mapping response.");
  }

  const parsed = parseColumnRoleResponse(text);
  if (!parsed.columns?.length) {
    throw new Error("Hugging Face schema mapping did not return column roles.");
  }

  const byColumn = new Map(parsed.columns.map((column) => [String(column.column ?? ""), column]));
  const protectedFallbackMappings = fallbackMappings.map(protectStudentIdentifierMapping);

  const mapped = protectedFallbackMappings.map((fallback) => {
    const protectedRole = inferStudentIdentifierRole(fallback.column);
    if (protectedRole) {
      return protectStudentIdentifierMapping(fallback);
    }

    const ai = byColumn.get(fallback.column);
    const role = normalizeRole(ai?.role);
    const headerDerivation = normalizeHeaderDerivation(ai?.headerDerivation);
    const confidence = normalizeConfidence(ai?.confidence, fallback.confidence);

    if (!ai || !role) {
      return fallback;
    }

    return protectStudentIdentifierMapping({
      ...fallback,
      field: role,
      confidence,
      confirmed: true,
      headerDerivation: role === "score" ? headerDerivation ?? fallback.headerDerivation : "none",
      evidence: [String(ai.reason ?? "Hugging Face classified this column from the header name")],
    });
  });

  return mapped.some((mapping) => mapping.field === "score") ? mapped : protectedFallbackMappings;
}

function buildColumnMappingPrompt(inferences: ColumnInference[]) {
  const payload = inferences.map((inference) => ({
    column: inference.column,
    localCandidates: inference.candidates.slice(0, 4).map((candidate) => ({
      role: candidate.mappedTo,
      confidence: candidate.confidence,
      headerDerivation: candidate.headerDerivation ?? "none",
    })),
  }));

  return [
    "Map each school spreadsheet column header into one role.",
    "Allowed roles:",
    internalFields.join(", "),
    "",
    "Important:",
    "- Use score for numeric/percentage/letter-grade/proficiency metric columns.",
    "- Support both English and Mongolian school headers. Mongolian examples: сурагч, нэр, дугаар, хичээл, сэдэв, чадвар, стандарт, шалгалт, даалгавар, оноо, хувь, дүн, авсан оноо, нийт оноо, огноо, улирал, бүлэг.",
    "- Use maxScore for possible points, denominator, or total possible columns.",
    "- Use category/topic/subject/assessment/group/term/metricLabel/context/notes for grouping or descriptive columns.",
    "- Never classify student, learner, pupil, child, name, roster, or ID headers as score, category, topic, metricLabel, context, or notes. Use studentName or studentId.",
    "- Use ignore only when a column is empty or not useful for classroom analytics.",
    "- For wide gradebook columns such as Quiz 1, Final Grade, Fractions, Homework Completion, or Geometry, choose score and set headerDerivation to metric or category.",
    "- Do not compute results. Do not evaluate students. Only classify headers.",
    "- Return JSON only with shape: {\"columns\":[{\"column\":\"same header\",\"role\":\"score\",\"confidence\":0.92,\"headerDerivation\":\"metric\",\"reason\":\"short reason\"}]}",
    "",
    JSON.stringify({ columns: payload }, null, 2),
  ].join("\n");
}

function parseColumnRoleResponse(text: string): AiColumnRoleResponse {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(jsonText) as AiColumnRoleResponse;
}

function normalizeRole(role: unknown): InternalField | null {
  const normalized = String(role ?? "").trim();
  const aliasKey = normalized.toLowerCase();
  const aliases: Record<string, InternalField> = {
    metric: "score",
    points: "score",
    grade: "score",
    percentage: "score",
    percent: "score",
    possible: "maxScore",
    denominator: "maxScore",
    standard: "category",
    skill: "category",
    class: "group",
    period: "term",
    comment: "notes",
    оноо: "score",
    хувь: "score",
    дүн: "score",
    үнэлгээ: "score",
    сэдэв: "topic",
    стандарт: "category",
    чадвар: "category",
    хичээл: "subject",
    шалгалт: "assessment",
    даалгавар: "assessment",
    нэр: "studentName",
    дугаар: "studentId",
    огноо: "date",
    улирал: "term",
    тэмдэглэл: "notes",
  };

  if (aliases[aliasKey]) {
    return aliases[aliasKey];
  }

  const exact = internalFields.find((field) => field.toLowerCase() === aliasKey);
  return exact ?? null;
}

function normalizeHeaderDerivation(value: unknown): HeaderDerivation | null {
  const normalized = String(value ?? "").trim();
  const allowed: HeaderDerivation[] = ["none", "topic", "assessment", "subject", "category", "metric"];
  return allowed.includes(normalized as HeaderDerivation) ? (normalized as HeaderDerivation) : null;
}

function normalizeConfidence(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, number));
}
