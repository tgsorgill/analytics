"use client";

import Papa from "papaparse";
import { parseScoreValue } from "@/lib/score";
import type { CsvRow, ParsedCsv } from "@/lib/types";
import { clamp, round } from "@/lib/utils";

export const MAX_CELL_LENGTH = 2_000;

type RawCsvRow = string[];

type HeaderDetection = {
  index: number;
  confidence: number;
  notes: string[];
};

const headerKeywords = [
  "student",
  "learner",
  "pupil",
  "name",
  "id",
  "subject",
  "course",
  "topic",
  "standard",
  "skill",
  "assessment",
  "assignment",
  "quiz",
  "test",
  "exam",
  "score",
  "percent",
  "percentage",
  "correct",
  "points",
  "grade",
  "date",
  "max",
  "possible",
];

export function sanitizeHeader(header: string) {
  return sanitizeCell(header).replace(/\s+/g, " ").trim();
}

export function sanitizeCell(value: unknown) {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, MAX_CELL_LENGTH)
    .trim();

  if (/^(=|\+|@)/.test(clean) || /^-(?!\d)/.test(clean)) {
    return `'${clean}`;
  }

  return clean;
}

export function parseCsvFile(file: File, onProgress?: (rowCount: number) => void): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const rawRows: RawCsvRow[] = [];
    const parseErrors: string[] = [];

    Papa.parse<RawCsvRow>(file, {
      header: false,
      skipEmptyLines: "greedy",
      chunkSize: 1024 * 256,
      chunk(result) {
        for (const error of result.errors) {
          parseErrors.push(`Row ${error.row ?? "?"}: ${error.message}`);
        }

        for (const row of result.data) {
          const sanitized = row.map(sanitizeCell);
          if (sanitized.some(Boolean)) {
            rawRows.push(sanitized);
          }
        }

        onProgress?.(rawRows.length);
      },
      complete() {
        const detected = detectHeaderRow(rawRows);
        const { columns, rows, notes } = materializeRows(rawRows, detected);

        resolve({
          fileName: file.name,
          columns,
          rows,
          rowCount: rows.length,
          parseErrors,
          truncated: rows.length > 100_000,
          detectedHeaderRow: detected.index + 1,
          headerConfidence: detected.confidence,
          structureNotes: [...detected.notes, ...notes],
        });
      },
      error(error) {
        reject(error);
      },
    });
  });
}

export function sampleValues(rows: CsvRow[], column: string, limit = 5) {
  const values: string[] = [];

  for (const row of rows) {
    const value = sanitizeCell(row[column]);
    if (value && !values.includes(value)) {
      values.push(value);
    }

    if (values.length >= limit) {
      break;
    }
  }

  return values;
}

function detectHeaderRow(rawRows: RawCsvRow[]): HeaderDetection {
  if (!rawRows.length) {
    return {
      index: 0,
      confidence: 0,
      notes: ["No rows were found in the CSV."],
    };
  }

  const candidates = rawRows.slice(0, Math.min(rawRows.length, 25)).map((row, index) => {
    const nextRows = rawRows.slice(index + 1, index + 8);
    return {
      index,
      score: headerRowScore(row, nextRows),
    };
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const notes: string[] = [];

  if (best.index > 0) {
    notes.push(`Detected ${best.index} pre-header row(s) and ignored them for analytics.`);
  }

  if (best.score < 0.55) {
    notes.push("Header confidence is low; review generated column names carefully.");
  }

  return {
    index: best.index,
    confidence: round(clamp(best.score, 0, 1), 2),
    notes,
  };
}

function headerRowScore(row: RawCsvRow, nextRows: RawCsvRow[]) {
  const cells = row.map(sanitizeHeader).filter(Boolean);
  if (!cells.length) {
    return 0;
  }

  const dataRows = nextRows.filter((candidate) => candidate.some(Boolean));
  const width = cells.length;
  const keywordHits = cells.filter((cell) => containsHeaderKeyword(cell)).length / width;
  const textLikeHeaders = cells.filter((cell) => /[a-z]/i.test(cell) && !parseScoreValue(cell)).length / width;
  const uniqueRatio = new Set(cells.map((cell) => cell.toLowerCase())).size / width;
  const dataCompatibility = dataRows.length ? compatibleDataRows(cells, dataRows) : 0.2;
  const rowDensity = width / Math.max(1, row.length);
  const tooNumericPenalty = cells.filter((cell) => Boolean(parseScoreValue(cell))).length / width;

  return (
    keywordHits * 0.32 +
    textLikeHeaders * 0.22 +
    uniqueRatio * 0.16 +
    dataCompatibility * 0.22 +
    rowDensity * 0.08 -
    tooNumericPenalty * 0.22
  );
}

function compatibleDataRows(headerCells: string[], rows: RawCsvRow[]) {
  const width = headerCells.length;
  const usableRows = rows.slice(0, 6);
  const scoredRows = usableRows.map((row) => {
    const nonEmpty = row.slice(0, width).filter(Boolean).length;
    const hasScore = row.some((cell) => Boolean(parseScoreValue(cell)));
    return (nonEmpty / width) * 0.7 + (hasScore ? 0.3 : 0);
  });

  if (!scoredRows.length) {
    return 0;
  }

  return scoredRows.reduce((sum, value) => sum + value, 0) / scoredRows.length;
}

function materializeRows(rawRows: RawCsvRow[], detected: HeaderDetection) {
  const notes: string[] = [];
  const headerRow = rawRows[detected.index] ?? [];
  const dataRows = rawRows.slice(detected.index + 1);
  const hasUsableHeader = detected.confidence >= 0.42 && headerRow.some(Boolean);
  const maxWidth = Math.max(headerRow.length, ...dataRows.map((row) => row.length), 0);
  const baseColumns = hasUsableHeader ? headerRow : [];

  if (!hasUsableHeader) {
    notes.push("Generated generic column names because a reliable header row was not found.");
  }

  const columns = uniquifyHeaders(
    Array.from({ length: maxWidth }, (_, index) => {
      const header = sanitizeHeader(baseColumns[index]);
      return header || `Column ${index + 1}`;
    }),
  );
  const rows: CsvRow[] = [];

  for (const row of dataRows) {
    const record: CsvRow = {};
    let nonEmpty = 0;

    columns.forEach((column, index) => {
      const value = sanitizeCell(row[index]);
      if (value) {
        nonEmpty += 1;
      }
      record[column] = value;
    });

    if (nonEmpty > 0) {
      rows.push(record);
    }
  }

  const duplicateCount = columns.filter((column) => / \(\d+\)$/.test(column)).length;
  if (duplicateCount) {
    notes.push(`Renamed ${duplicateCount} duplicate column header(s) to keep mappings stable.`);
  }

  return {
    columns,
    rows,
    notes,
  };
}

function uniquifyHeaders(headers: string[]) {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const fallback = header || `Column ${index + 1}`;
    const count = counts.get(fallback) ?? 0;
    counts.set(fallback, count + 1);

    if (count === 0) {
      return fallback;
    }

    return `${fallback} (${count + 1})`;
  });
}

function containsHeaderKeyword(cell: string) {
  const normalized = cell.toLowerCase();
  return headerKeywords.some((keyword) => normalized.includes(keyword));
}
