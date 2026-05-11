import { sanitizeCell } from "@/lib/csv";
import { isProtectedDateHeader } from "@/lib/headerRoles";
import { inferStudentIdentifierRole, isStudentIdentifierKey } from "@/lib/privacy";
import { parseScoreValue, toNumber } from "@/lib/score";
import {
  ColumnMapping,
  CsvRow,
  NormalizationIssue,
  NormalizationResult,
  NormalizedRecord,
  NormalizedRecordSchema,
} from "@/lib/types";

export function normalizeRows(rows: CsvRow[], mappings: ColumnMapping[]): NormalizationResult {
  const records: NormalizedRecord[] = [];
  const issues: NormalizationIssue[] = [];
  const warnings = new Set<string>();
  const activeMappings = mappings.map(protectStudentIdentifierMapping).filter((mapping) => mapping.field !== "ignore");
  const scoreMappings = activeMappings.filter((mapping) => mapping.field === "score");
  const maxScoreMappings = activeMappings.filter((mapping) => mapping.field === "maxScore");
  let skippedValues = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const base = baseRecordFromRow(row, activeMappings);
    const explicitMaxScore = firstNumericValue(row, maxScoreMappings);

    for (const scoreMapping of scoreMappings) {
      const rawScore = row[scoreMapping.column];
      const parsed = parseScoreValue(rawScore, explicitMaxScore ?? undefined);

      if (!parsed) {
        if (sanitizeCell(rawScore)) {
          issues.push({
            rowNumber,
            column: scoreMapping.column,
            message: "Score value could not be parsed.",
          });
          skippedValues += 1;
        }
        continue;
      }

      const record: NormalizedRecord = {
        ...base,
        score: parsed.score,
        maxScore: explicitMaxScore ?? parsed.maxScore,
      };

      if (parsed.source === "proficiency") {
        warnings.add("Some proficiency labels were converted to a deterministic 0-100 scale after mapping confirmation.");
      }

      applyHeaderDerivation(record, scoreMapping);

      const validated = NormalizedRecordSchema.safeParse(record);
      if (!validated.success) {
        issues.push({
          rowNumber,
          column: scoreMapping.column,
          message: "Normalized record did not pass validation.",
        });
        skippedValues += 1;
        continue;
      }

      records.push(validated.data);
    }
  });

  if (scoreMappings.length > 1 && !scoreMappings.some((mapping) => mapping.headerDerivation !== "none")) {
    warnings.add("Multiple score columns were mapped without a header label. Topic charts may be incomplete.");
  }

  if (records.some((record) => record.maxScore === undefined && record.score > 100)) {
    warnings.add("Some scores exceed 100 without max-score values. They are shown as provided.");
  }

  return {
    records,
    issues,
    warnings: Array.from(warnings),
    summary: {
      sourceRows: rows.length,
      normalizedRecords: records.length,
      skippedValues,
      scoreColumns: scoreMappings.length,
    },
  };
}

function baseRecordFromRow(row: CsvRow, mappings: ColumnMapping[]) {
  const record: Partial<NormalizedRecord> = {};

  for (const mapping of mappings) {
    if (mapping.field === "score" || mapping.field === "maxScore" || mapping.field === "ignore") {
      continue;
    }

    const value = sanitizeCell(row[mapping.column]);
    if (!value) {
      continue;
    }

    const protectedRole = inferStudentIdentifierRole(mapping.column);
    if (protectedRole) {
      record[protectedRole] = value;
      continue;
    }

    if (mapping.field === "date") {
      const iso = toIsoDate(value);
      if (iso) {
        record.date = iso;
      }
      continue;
    }

    if (mapping.field === "term") {
      record.term = value;
      addDimension(record, mapping.column, value);
      continue;
    }

    if (mapping.field === "category") {
      if (!record.topic) {
        record.topic = value;
      }
      addDimension(record, mapping.column, value);
      continue;
    }

    if (mapping.field === "group") {
      if (!record.subject) {
        record.subject = value;
      }
      addDimension(record, mapping.column, value);
      continue;
    }

    if (mapping.field === "metricLabel") {
      record.metricName = value;
      if (!record.assessment) {
        record.assessment = value;
      }
      addDimension(record, mapping.column, value);
      continue;
    }

    if (mapping.field === "context" || mapping.field === "notes") {
      addDimension(record, mapping.column, value);
      continue;
    }

    if (mapping.field === "studentId" || mapping.field === "studentName") {
      record[mapping.field] = value;
      continue;
    }

    if (mapping.field === "subject" || mapping.field === "assessment" || mapping.field === "topic") {
      record[mapping.field] = value;
      addDimension(record, mapping.column, value);
    }
  }

  return record;
}

function firstNumericValue(row: CsvRow, mappings: ColumnMapping[]) {
  for (const mapping of mappings) {
    const value = toNumber(row[mapping.column]);
    if (value !== null && value > 0) {
      return value;
    }
  }

  return null;
}

function applyHeaderDerivation(record: NormalizedRecord, mapping: ColumnMapping) {
  if (mapping.headerDerivation === "topic" && !record.topic) {
    record.topic = mapping.column;
  }

  if (mapping.headerDerivation === "assessment" && !record.assessment) {
    record.assessment = mapping.column;
  }

  if (mapping.headerDerivation === "subject" && !record.subject) {
    record.subject = mapping.column;
  }

  if (mapping.headerDerivation === "category") {
    if (!record.topic) {
      record.topic = mapping.column;
    }
    addDimension(record, "Column category", mapping.column);
  }

  if (mapping.headerDerivation === "metric") {
    record.metricName = mapping.column;
    if (!record.assessment) {
      record.assessment = mapping.column;
    }
  }
}

function toIsoDate(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    return undefined;
  }

  return new Date(time).toISOString().slice(0, 10);
}

function protectStudentIdentifierMapping(mapping: ColumnMapping): ColumnMapping {
  if (mapping.field === "ignore") {
    return mapping;
  }

  if (isProtectedDateHeader(mapping.column) && mapping.field !== "date") {
    return {
      ...mapping,
      field: "date",
      headerDerivation: "none",
    };
  }

  const protectedRole = inferStudentIdentifierRole(mapping.column);
  if (!protectedRole || mapping.field === protectedRole) {
    return mapping;
  }

  return {
    ...mapping,
    field: protectedRole,
    headerDerivation: "none",
  };
}

function addDimension(record: Partial<NormalizedRecord>, key: string, value: string) {
  if (!value || isStudentIdentifierKey(key)) {
    return;
  }

  record.dimensions = {
    ...(record.dimensions ?? {}),
    [key]: value,
  };
}
