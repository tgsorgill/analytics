import { clamp, round } from "@/lib/utils";

export type ParsedScore = {
  score: number;
  maxScore?: number;
  percentage: number;
  source: "percent" | "fraction" | "number" | "decimal" | "proficiency";
};

const numberPattern = /-?\d+(?:[.,]\d+)?/g;

export function parseScoreValue(value: unknown, explicitMaxScore?: number): ParsedScore | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value)
    .replace(/^'/, "")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  const proficiency = parseProficiencyValue(text);
  if (proficiency !== null) {
    return {
      score: proficiency,
      maxScore: 100,
      percentage: proficiency,
      source: "proficiency",
    };
  }

  const percentMatch = text.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  if (percentMatch) {
    const score = toNumber(percentMatch[1]);
    if (score === null) {
      return null;
    }

    return {
      score,
      maxScore: 100,
      percentage: clamp(score, 0, 150),
      source: "percent",
    };
  }

  const fractionMatch = text.match(/(-?\d+(?:[.,]\d+)?)\s*(?:\/|out of|аас|өөс|нийт)\s*(\d+(?:[.,]\d+)?)/i);
  if (fractionMatch) {
    const score = toNumber(fractionMatch[1]);
    const maxScore = toNumber(fractionMatch[2]);
    if (score === null || maxScore === null || maxScore <= 0) {
      return null;
    }

    return {
      score,
      maxScore,
      percentage: round((score / maxScore) * 100, 2),
      source: "fraction",
    };
  }

  const matches = text.match(numberPattern);
  if (!matches?.length) {
    return null;
  }

  const score = toNumber(matches[0]);
  if (score === null) {
    return null;
  }

  if (explicitMaxScore && explicitMaxScore > 0) {
    return {
      score,
      maxScore: explicitMaxScore,
      percentage: round((score / explicitMaxScore) * 100, 2),
      source: "number",
    };
  }

  if (score > 0 && score <= 1 && text.match(/^0?[.,]\d+$/)) {
    return {
      score: round(score * 100, 2),
      maxScore: 100,
      percentage: round(score * 100, 2),
      source: "decimal",
    };
  }

  return {
    score,
    percentage: score,
    source: "number",
  };
}

export function parseProficiencyValue(value: string) {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const rubric: Record<string, number> = {
    "a+": 98,
    a: 95,
    "a-": 90,
    "b+": 88,
    b: 85,
    "b-": 80,
    "c+": 78,
    c: 75,
    "c-": 70,
    "d+": 68,
    d: 65,
    "d-": 60,
    f: 45,
    advanced: 95,
    exceeds: 95,
    mastered: 90,
    proficient: 85,
    meets: 85,
    pass: 85,
    yes: 85,
    approaching: 72,
    developing: 65,
    "partially meets": 65,
    beginning: 50,
    "not yet": 45,
    "does not meet": 45,
    fail: 45,
    no: 45,
    "ахисан": 95,
    "давсан": 95,
    "эзэмшсэн": 90,
    "чадварлаг": 85,
    "хангалттай": 85,
    "тэнцсэн": 85,
    "тийм": 85,
    "ойртож байна": 72,
    "хөгжиж байна": 65,
    "хэсэгчлэн хангалттай": 65,
    "эхэлж байна": 50,
    "хараахан биш": 45,
    "хангалтгүй": 45,
    "унасан": 45,
    "үгүй": 45,
  };

  return rubric[normalized] ?? null;
}

export function scoreToPercent(score: number, maxScore?: number) {
  if (maxScore && maxScore > 0) {
    return round((score / maxScore) * 100, 2);
  }

  if (score > 0 && score <= 1) {
    return round(score * 100, 2);
  }

  return score;
}

export function toNumber(value: unknown) {
  const number = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}
