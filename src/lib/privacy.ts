export function normalizePrivacyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferStudentIdentifierRole(value: string): "studentId" | "studentName" | null {
  const normalized = normalizePrivacyKey(value);
  if (!normalized) {
    return null;
  }

  const hasStudentWord = /\b(student|learner|pupil|child)\b/.test(normalized);
  const hasIdWord = /\b(id|sid|sis|number|no|identifier|roster|code)\b|#/.test(normalized);
  const hasNameWord = /\b(name|full name|first name|last name)\b/.test(normalized);

  if (hasStudentWord && hasIdWord) {
    return "studentId";
  }

  if (hasStudentWord && (hasNameWord || /\bn\b/.test(normalized) || normalized === "student")) {
    return "studentName";
  }

  if (["name", "full name", "first name", "last name"].includes(normalized)) {
    return "studentName";
  }

  if (["id", "sid", "sis", "roster", "student n"].includes(normalized)) {
    return normalized === "student n" ? "studentName" : "studentId";
  }

  return null;
}

export function isStudentIdentifierKey(value: string) {
  return inferStudentIdentifierRole(value) !== null;
}
