import type { ColumnInference, ColumnMapping, MappingValidation } from "@/lib/types";
import { isProtectedDateHeader } from "@/lib/headerRoles";
import { inferStudentIdentifierRole } from "@/lib/privacy";

export function mappingsFromInference(inferences: ColumnInference[]): ColumnMapping[] {
  const mappings = inferences
    .map((inference) => ({
      column: inference.column,
      field: inference.selected.mappedTo,
      confidence: inference.selected.confidence,
      confirmed: true,
      headerDerivation: inference.selected.headerDerivation ?? "none",
      evidence: inference.selected.evidence,
    }))
    .map(protectStudentIdentifierMapping);

  if (!mappings.some((mapping) => mapping.field === "score")) {
    const bestScore = inferences
      .map((inference) => ({
        inference,
        candidate: inference.candidates.find((candidate) => candidate.mappedTo === "score"),
      }))
      .filter((item) => item.candidate)
      .sort((a, b) => (b.candidate?.confidence ?? 0) - (a.candidate?.confidence ?? 0))[0];

    const candidate = bestScore?.candidate;

    if (candidate && candidate.confidence >= 0.28) {
      return mappings.map((mapping) =>
        mapping.column === bestScore.inference.column
          ? protectStudentIdentifierMapping({
              ...mapping,
              field: "score",
              confidence: Math.max(candidate.confidence, 0.5),
              headerDerivation: candidate.headerDerivation ?? "metric",
              evidence: [...candidate.evidence, "Automatically selected as the most score-like column"],
            })
          : mapping,
      );
    }
  }

  return mappings;
}

export function protectStudentIdentifierMapping(mapping: ColumnMapping): ColumnMapping {
  if (mapping.field === "ignore") {
    return mapping;
  }

  if (isProtectedDateHeader(mapping.column) && mapping.field !== "date") {
    return {
      ...mapping,
      field: "date",
      confidence: Math.max(mapping.confidence, 0.96),
      confirmed: true,
      headerDerivation: "none",
      evidence: [...mapping.evidence, "Date headers are kept out of score and grade mappings."],
    };
  }

  const protectedRole = inferStudentIdentifierRole(mapping.column);
  if (!protectedRole || mapping.field === protectedRole) {
    return mapping;
  }

  return {
    ...mapping,
    field: protectedRole,
    confidence: Math.max(mapping.confidence, 0.92),
    confirmed: true,
    headerDerivation: "none",
    evidence: [...mapping.evidence, "Student identifier headers are kept out of analytical categories."],
  };
}

export function validateMappings(mappings: ColumnMapping[]): MappingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const needsConfirmation: string[] = [];
  const scoreMappings = mappings.filter((mapping) => mapping.field === "score");
  const groupingMappings = mappings.filter((mapping) =>
    ["topic", "subject", "assessment", "category", "group", "term", "metricLabel", "context"].includes(mapping.field),
  );
  const scoreHeaderGroups = scoreMappings.filter((mapping) => mapping.headerDerivation !== "none");

  if (!scoreMappings.length) {
    errors.push("Map at least one uploaded column to Score.");
  }

  if (!groupingMappings.length && !scoreHeaderGroups.length) {
    warnings.push("No grouping/category columns were mapped. Analytics will focus on overall score patterns.");
  }

  const studentFields = mappings.filter((mapping) => ["studentId", "studentName"].includes(mapping.field));
  if (!studentFields.length) {
    warnings.push("No student identifier was mapped. Analytics still run, but exports will not include student labels.");
  }

  const maxScoreCount = mappings.filter((mapping) => mapping.field === "maxScore").length;
  if (maxScoreCount > 1) {
    warnings.push("Multiple max-score columns are mapped. The first usable value in each row will be used.");
  }

  return {
    canProceed: errors.length === 0 && needsConfirmation.length === 0,
    errors,
    warnings,
    needsConfirmation,
  };
}
