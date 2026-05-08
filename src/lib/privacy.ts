export function normalizePrivacyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferStudentIdentifierRole(value: string): "studentId" | "studentName" | null {
  const normalized = normalizePrivacyKey(value);
  if (!normalized) {
    return null;
  }

  const hasStudentWord = /\b(student|learner|pupil|child)\b/.test(normalized);
  const hasMongolianStudentWord = /(сурагч|суралцагч|хүүхэд)/.test(normalized);
  const hasIdWord = /\b(id|sid|sis|number|no|identifier|roster|code)\b|#/.test(normalized) || /(дугаар|код|бүртгэл)/.test(normalized);
  const hasNameWord = /\b(name|full name|first name|last name)\b/.test(normalized) || /(нэр|овог)/.test(normalized);

  if ((hasStudentWord || hasMongolianStudentWord) && hasIdWord) {
    return "studentId";
  }

  if ((hasStudentWord || hasMongolianStudentWord) && (hasNameWord || /\bn\b/.test(normalized) || normalized === "student" || normalized === "сурагч")) {
    return "studentName";
  }

  if (["name", "full name", "first name", "last name", "нэр", "овог нэр", "сурагчийн нэр"].includes(normalized)) {
    return "studentName";
  }

  if (["id", "sid", "sis", "roster", "student n", "дугаар", "код", "сурагчийн дугаар"].includes(normalized)) {
    return normalized === "student n" ? "studentName" : "studentId";
  }

  return null;
}

export function isStudentIdentifierKey(value: string) {
  return inferStudentIdentifierRole(value) !== null;
}
