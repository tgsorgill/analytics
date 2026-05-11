export function normalizeHeaderLabel(header: string) {
  return header
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s/%.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const dateHeaderPattern = /\b(date|dates|timestamp|submitted|taken|completed|due|assigned)\b/i;
const exactDateHeaders = new Set(["day", "time", "огноо", "өдөр", "хугацаа", "Ð¾Ð³Ð½Ð¾Ð¾"]);
const dateHeaderFragments = [
  "огноо",
  "өгсөн огноо",
  "авсан огноо",
  "дууссан огноо",
  "шалгалтын огноо",
  "даалгаврын огноо",
  "Ð¾Ð³Ð½Ð¾Ð¾",
];

export function isProtectedDateHeader(header: string) {
  const normalized = normalizeHeaderLabel(header);
  if (!normalized) {
    return false;
  }

  return dateHeaderPattern.test(normalized) || exactDateHeaders.has(normalized) || dateHeaderFragments.some((fragment) => normalized.includes(fragment));
}
