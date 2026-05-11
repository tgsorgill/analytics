import { sampleValues } from "@/lib/csv";
import { isProtectedDateHeader, normalizeHeaderLabel } from "@/lib/headerRoles";
import { inferStudentIdentifierRole } from "@/lib/privacy";
import { parseScoreValue } from "@/lib/score";
import type { ColumnInference, CsvRow, FieldCandidate, HeaderDerivation, InternalField } from "@/lib/types";
import { clamp, round } from "@/lib/utils";

const keywordMap: Record<InternalField, string[]> = {
  studentId: [
    "student id",
    "student_id",
    "student no",
    "student number",
    "learner id",
    "learner number",
    "school id",
    "id",
    "sid",
    "sis",
    "number",
    "roster",
    "сурагчийн id",
    "сурагчийн дугаар",
    "дугаар",
    "бүртгэлийн дугаар",
    "код",
  ],
  studentName: [
    "student",
    "student n",
    "student name",
    "name",
    "learner",
    "learner name",
    "pupil",
    "pupil name",
    "child",
    "full name",
    "last name",
    "first name",
    "сурагч",
    "сурагчийн нэр",
    "нэр",
    "овог нэр",
    "овог",
    "өөрийн нэр",
  ],
  subject: ["subject", "course", "class", "discipline", "content area", "area", "department", "хичээл", "судлагдахуун", "курс", "анги"],
  assessment: [
    "assessment",
    "assignment",
    "quiz",
    "test",
    "exam",
    "task",
    "benchmark",
    "unit",
    "homework",
    "classwork",
    "project",
    "exit ticket",
    "checkpoint",
    "formative",
    "summative",
    "semester exam",
    "midterm",
    "final",
    "portfolio",
    "үнэлгээ",
    "шалгалт",
    "сорил",
    "тест",
    "даалгавар",
    "гэрийн даалгавар",
    "анги ажил",
    "төсөл",
    "явцын",
    "эцсийн",
    "улирлын шалгалт",
  ],
  topic: [
    "topic",
    "standard",
    "skill",
    "strand",
    "domain",
    "concept",
    "objective",
    "learning target",
    "outcome",
    "category",
    "subtopic",
    "module",
    "lesson",
    "criterion",
    "rubric",
    "indicator",
    "сэдэв",
    "стандарт",
    "чадвар",
    "чадамж",
    "зорилт",
    "нэгж",
    "агуулга",
    "үзүүлэлт",
    "шалгуур",
  ],
  category: [
    "category",
    "type",
    "standard",
    "skill",
    "strand",
    "domain",
    "outcome",
    "competency",
    "rubric",
    "criteria",
    "criterion",
    "objective",
    "unit",
    "module",
    "ангилал",
    "төрөл",
    "стандарт",
    "чадвар",
    "чадамж",
    "шалгуур",
    "нэгж",
  ],
  group: [
    "group",
    "section",
    "class",
    "period",
    "cohort",
    "grade level",
    "grade",
    "homeroom",
    "teacher",
    "campus",
    "school",
    "бүлэг",
    "анги",
    "хэсэг",
    "түвшин",
    "сургууль",
    "багш",
  ],
  term: ["term", "semester", "quarter", "trimester", "cycle", "grading period", "week", "month", "year", "session", "улирал", "хагас жил", "сар", "долоо хоног", "жил", "үе"],
  metricLabel: ["metric", "measure", "indicator", "criterion", "component", "category", "grade item", "task name", "item", "хэмжүүр", "үзүүлэлт", "шалгуур", "бүрэлдэхүүн", "дүнгийн зүйл"],
  context: ["context", "notes", "comment", "status", "level", "track", "program", "intervention", "accommodation", "контекст", "төлөв", "түвшин", "хөтөлбөр", "дэмжлэг"],
  notes: ["note", "notes", "comment", "comments", "remark", "remarks", "feedback", "observation", "тэмдэглэл", "тайлбар", "санал", "ажиглалт"],
  score: [
    "score",
    "percent",
    "percentage",
    "correct",
    "grade",
    "points",
    "mark",
    "result",
    "earned",
    "raw",
    "value",
    "proficiency",
    "mastery",
    "rating",
    "avg",
    "average",
    "semester average",
    "final grade",
    "term grade",
    "letter grade",
    "оноо",
    "хувь",
    "дүн",
    "авсан",
    "авсан оноо",
    "зөв",
    "дүнгийн хувь",
    "үнэлгээ",
    "түвшин",
    "эзэмшил",
    "дундаж",
    "эцсийн дүн",
  ],
  maxScore: ["max", "maximum", "possible", "out of", "total points", "total", "possible score", "points possible", "denominator", "дээд", "нийт", "боломжит", "нийт оноо", "дээд оноо"],
  date: ["date", "day", "submitted", "taken", "completed", "month", "timestamp", "time", "due", "assigned", "огноо", "өдөр", "сар", "хугацаа", "өгсөн", "дууссан"],
  ignore: [],
};

const academicHeaderHints = [
  "algebra",
  "geometry",
  "fraction",
  "fractions",
  "decimals",
  "reading",
  "writing",
  "science",
  "history",
  "vocabulary",
  "comprehension",
  "measurement",
  "probability",
  "statistics",
  "grammar",
  "phonics",
  "number sense",
  "математик",
  "монгол хэл",
  "англи хэл",
  "байгалийн ухаан",
  "нийгмийн ухаан",
  "түүх",
  "газарзүй",
  "геометр",
  "бутархай",
  "уншлага",
  "бичих",
  "үгийн сан",
];

type ColumnProfile = {
  header: string;
  normalizedHeader: string;
  nonEmpty: number;
  emptyRatio: number;
  numericRatio: number;
  percentRatio: number;
  fractionRatio: number;
  proficiencyRatio: number;
  dateRatio: number;
  uniqueRatio: number;
  lowCardinalityRatio: number;
  textRatio: number;
};

export function inferSchema(rows: CsvRow[], columns: string[]): ColumnInference[] {
  const raw = columns.map((column) => inferColumn(rows, column));
  return applyTableLevelAdjustments(raw, rows);
}

export function inferColumn(rows: CsvRow[], column: string): ColumnInference {
  const profile = profileColumn(rows, column);
  const candidates = buildCandidates(profile)
    .filter((candidate) => candidate.confidence > 0.05)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const selected = candidates[0] ?? {
    mappedTo: "ignore",
    confidence: 0.1,
    evidence: ["No reliable signal found"],
    headerDerivation: "none",
  };
  const second = candidates[1];
  const ambiguous = Boolean(second && selected.confidence - second.confidence < 0.15);
  const requiresConfirmation =
    selected.confidence < 0.7 ||
    ambiguous ||
    (["score", "topic", "subject"].includes(selected.mappedTo) && selected.confidence < 0.85);

  return {
    column,
    samples: sampleValues(rows, column),
    candidates,
    selected,
    ambiguous,
    requiresConfirmation,
  };
}

function buildCandidates(profile: ColumnProfile): FieldCandidate[] {
  const candidates: FieldCandidate[] = [
    scoreCandidate(profile),
    maxScoreCandidate(profile),
    dateCandidate(profile),
    termCandidate(profile),
    studentIdCandidate(profile),
    studentNameCandidate(profile),
    topicCandidate(profile),
    categoryCandidate(profile),
    subjectCandidate(profile),
    groupCandidate(profile),
    assessmentCandidate(profile),
    metricLabelCandidate(profile),
    contextCandidate(profile),
    notesCandidate(profile),
    ignoreCandidate(profile),
  ];

  return candidates.map((candidate) => ({
    ...candidate,
    confidence: round(clamp(candidate.confidence, 0, 1), 2),
  }));
}

function scoreCandidate(profile: ColumnProfile): FieldCandidate {
  const scoreKeywords = keywordScore(profile, "score");
  const studentRole = inferStudentIdentifierRole(profile.header);
  const protectedDateHeader = isProtectedDateHeader(profile.header);
  const assessmentKeywords = keywordScore(profile, "assessment");
  const topicKeywords = keywordScore(profile, "topic");
  const academicHint = academicHeaderHints.some((word) => profile.normalizedHeader.includes(word));
  const scoreLikeRatio = Math.max(profile.numericRatio, profile.proficiencyRatio);
  let confidence = scoreKeywords * 0.52 + scoreLikeRatio * 0.38 + profile.percentRatio * 0.1 + profile.fractionRatio * 0.08;
  const evidence: string[] = [];
  let headerDerivation: HeaderDerivation = "none";

  if (studentRole && scoreKeywords === 0) {
    return {
      mappedTo: "score",
      confidence: 0.02,
      evidence: ["Header looks like a student identifier, not a score"],
      headerDerivation: "none",
    };
  }

  if (protectedDateHeader) {
    return {
      mappedTo: "score",
      confidence: 0.01,
      evidence: ["Header is protected as a date field, not a grade or score"],
      headerDerivation: "none",
    };
  }

  if (scoreKeywords > 0) {
    evidence.push("Header contains score-related language");
  }

  if (scoreLikeRatio >= 0.8) {
    evidence.push("Most sampled values look like scores");
  }

  if (profile.percentRatio > 0.2) {
    evidence.push("Values include percentages");
  }

  if (profile.fractionRatio > 0.2) {
    evidence.push("Values include score/max patterns");
  }

  if (profile.proficiencyRatio >= 0.65) {
    confidence = Math.max(confidence, 0.74);
    evidence.push("Values match common proficiency or mastery labels");
  }

  if (profile.dateRatio >= 0.75 && scoreKeywords < 0.5) {
    confidence = Math.min(confidence, 0.18);
    evidence.push("Values look like dates, so score confidence was reduced");
  }

  if (scoreKeywords === 0 && scoreLikeRatio >= 0.82 && (academicHint || topicKeywords > 0.35)) {
    confidence = Math.max(confidence, 0.78);
    headerDerivation = "topic";
    evidence.push("Academic header with numeric values suggests a wide topic score column");
  } else if (scoreKeywords === 0 && assessmentKeywords > 0.35 && scoreLikeRatio >= 0.75) {
    confidence = Math.max(confidence, 0.76);
    headerDerivation = "assessment";
    evidence.push("Assessment-style header with score-like values suggests a wide assessment score column");
  } else if (scoreKeywords === 0 && scoreLikeRatio >= 0.9) {
    confidence = Math.max(confidence, 0.66);
    evidence.push("Score-like values without a strong header signal");
  }

  if (assessmentKeywords > 0.4 && scoreLikeRatio >= 0.75) {
    headerDerivation = "assessment";
    evidence.push("Assessment-style header can label this score column");
  }

  return {
    mappedTo: "score",
    confidence,
    evidence,
    headerDerivation,
  };
}

function maxScoreCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "maxScore");
  if (isProtectedDateHeader(profile.header)) {
    return {
      mappedTo: "maxScore",
      confidence: 0.01,
      evidence: ["Header is protected as a date field, not a max score"],
      headerDerivation: "none",
    };
  }

  const confidence = keyword * 0.64 + profile.numericRatio * 0.26;
  const evidence = [
    ...(keyword ? ["Header suggests maximum or possible points"] : []),
    ...(profile.numericRatio > 0.75 ? ["Values are numeric"] : []),
  ];

  return {
    mappedTo: "maxScore",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function dateCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "date");
  const protectedDateHeader = isProtectedDateHeader(profile.header);
  const confidence = protectedDateHeader ? Math.max(0.96, profile.dateRatio >= 0.35 ? 0.99 : 0.96) : keyword * 0.55 + profile.dateRatio * 0.4;
  const evidence = [
    ...(protectedDateHeader ? ["Header is protected as a date field"] : []),
    ...(keyword ? ["Header suggests a date"] : []),
    ...(profile.dateRatio > 0.6 ? ["Most sampled values parse as dates"] : []),
  ];

  return {
    mappedTo: "date",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function studentIdCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "studentId");
  const studentRole = inferStudentIdentifierRole(profile.header);
  let confidence = keyword * 0.6 + profile.uniqueRatio * 0.16 + profile.textRatio * 0.08;
  const evidence = [
    ...(keyword ? ["Header suggests a student identifier"] : []),
    ...(profile.uniqueRatio > 0.8 ? ["Values are mostly unique"] : []),
  ];

  if (studentRole === "studentId") {
    confidence = Math.max(confidence, profile.numericRatio > 0.45 ? 0.9 : 0.82);
    evidence.push("Header is protected as a student identifier");
  } else if (studentRole === "studentName") {
    confidence = Math.min(confidence, 0.18);
  }

  return {
    mappedTo: "studentId",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function studentNameCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "studentName");
  const studentRole = inferStudentIdentifierRole(profile.header);
  let confidence =
    keyword * 0.62 + profile.textRatio * 0.22 + profile.uniqueRatio * 0.08 - profile.numericRatio * 0.18 - profile.lowCardinalityRatio * 0.08;
  const evidence = [
    ...(keyword ? ["Header suggests student names"] : []),
    ...(profile.textRatio > 0.7 ? ["Values are mostly text"] : []),
  ];

  if (studentRole === "studentName") {
    confidence = Math.max(confidence, profile.textRatio > 0.45 ? 0.9 : 0.76);
    evidence.push("Header is protected as a student name field");
  } else if (studentRole === "studentId") {
    confidence = Math.min(confidence, 0.28);
  }

  return {
    mappedTo: "studentName",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function topicCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "topic");
  const academicHint = academicHeaderHints.some((word) => profile.normalizedHeader.includes(word));
  const confidence = demoteStudentIdentifierDimension(
    profile,
    keyword * 0.64 + profile.textRatio * 0.18 + profile.lowCardinalityRatio * 0.12 + (academicHint ? 0.12 : 0),
  );
  const evidence = [
    ...(keyword ? ["Header suggests topic or skill"] : []),
    ...(profile.textRatio > 0.7 ? ["Values are mostly text labels"] : []),
    ...(profile.lowCardinalityRatio > 0.35 ? ["Repeated values look like grouping categories"] : []),
    ...(academicHint ? ["Header matches common academic topic language"] : []),
  ];

  return {
    mappedTo: "topic",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function categoryCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "category");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.62 + profile.textRatio * 0.16 + profile.lowCardinalityRatio * 0.14);
  const evidence = [
    ...(keyword ? ["Header suggests a flexible category, standard, skill, or rubric field"] : []),
    ...(profile.textRatio > 0.6 ? ["Values are mostly text labels"] : []),
    ...(profile.lowCardinalityRatio > 0.3 ? ["Repeated labels can be used as dashboard groups"] : []),
  ];

  return {
    mappedTo: "category",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function subjectCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "subject");
  const subjectHint = ["math", "ela", "english", "science", "social studies", "history"].some((word) =>
    profile.normalizedHeader.includes(word),
  );
  const confidence = demoteStudentIdentifierDimension(
    profile,
    keyword * 0.64 + profile.textRatio * 0.16 + profile.lowCardinalityRatio * 0.12 + (subjectHint ? 0.1 : 0),
  );
  const evidence = [
    ...(keyword ? ["Header suggests subject or course"] : []),
    ...(profile.textRatio > 0.7 ? ["Values are mostly text labels"] : []),
    ...(subjectHint ? ["Header matches common subject language"] : []),
  ];

  return {
    mappedTo: "subject",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function groupCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "group");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.62 + profile.textRatio * 0.14 + profile.lowCardinalityRatio * 0.16);
  const evidence = [
    ...(keyword ? ["Header suggests class, section, cohort, or school group"] : []),
    ...(profile.lowCardinalityRatio > 0.3 ? ["Repeated values look like groups"] : []),
  ];

  return {
    mappedTo: "group",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function assessmentCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "assessment");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.62 + profile.textRatio * 0.18 + profile.lowCardinalityRatio * 0.08);
  const evidence = [
    ...(keyword ? ["Header suggests assessment type or name"] : []),
    ...(profile.textRatio > 0.65 ? ["Values are mostly text labels"] : []),
  ];

  return {
    mappedTo: "assessment",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function termCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "term");
  const confidence = demoteStudentIdentifierDimension(
    profile,
    keyword * 0.64 + profile.textRatio * 0.12 + profile.lowCardinalityRatio * 0.16 + profile.dateRatio * 0.08,
  );
  const evidence = [
    ...(keyword ? ["Header suggests semester, quarter, or reporting period"] : []),
    ...(profile.lowCardinalityRatio > 0.3 ? ["Repeated values look like periods"] : []),
  ];

  return {
    mappedTo: "term",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function metricLabelCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "metricLabel");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.62 + profile.textRatio * 0.14 + profile.lowCardinalityRatio * 0.1);
  const evidence = [
    ...(keyword ? ["Header suggests metric, component, or grade item labels"] : []),
    ...(profile.textRatio > 0.6 ? ["Values are mostly text labels"] : []),
  ];

  return {
    mappedTo: "metricLabel",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function contextCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "context");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.55 + profile.textRatio * 0.12 + profile.lowCardinalityRatio * 0.12);
  const evidence = [
    ...(keyword ? ["Header suggests contextual school information"] : []),
    ...(profile.textRatio > 0.6 ? ["Values are mostly text"] : []),
  ];

  return {
    mappedTo: "context",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function notesCandidate(profile: ColumnProfile): FieldCandidate {
  const keyword = keywordScore(profile, "notes");
  const confidence = demoteStudentIdentifierDimension(profile, keyword * 0.72 + profile.textRatio * 0.08);
  const evidence = [
    ...(keyword ? ["Header suggests comments or teacher notes"] : []),
    ...(profile.textRatio > 0.7 ? ["Values are mostly text"] : []),
  ];

  return {
    mappedTo: "notes",
    confidence,
    evidence,
    headerDerivation: "none",
  };
}

function ignoreCandidate(profile: ColumnProfile): FieldCandidate {
  const confidence = profile.emptyRatio > 0.95 ? 0.95 : profile.nonEmpty === 0 ? 1 : 0.08;

  return {
    mappedTo: "ignore",
    confidence,
    evidence: confidence > 0.8 ? ["Column is empty in sampled rows"] : ["No strong mapping signal"],
    headerDerivation: "none",
  };
}

function keywordScore(profile: ColumnProfile, field: InternalField) {
  const keywords = keywordMap[field];
  if (!keywords.length) {
    return 0;
  }

  const matches = keywords.filter((keyword) => profile.normalizedHeader.includes(keyword)).length;
  if (matches === 0) {
    return 0;
  }

  return clamp(0.55 + matches * 0.18, 0, 1);
}

function demoteStudentIdentifierDimension(profile: ColumnProfile, confidence: number) {
  return inferStudentIdentifierRole(profile.header) ? Math.min(confidence, 0.04) : confidence;
}

function profileColumn(rows: CsvRow[], column: string): ColumnProfile {
  const sample = rows.slice(0, 200).map((row) => String(row[column] ?? "").trim());
  const nonEmptyValues = sample.filter(Boolean);
  const nonEmpty = nonEmptyValues.length;
  const uniqueValues = new Set(nonEmptyValues.map((value) => value.toLowerCase()));
  const parsedScores = nonEmptyValues.map((value) => parseScoreValue(value));
  const numeric = parsedScores.filter(Boolean).length;
  const percentages = parsedScores.filter((score) => score?.source === "percent" || score?.source === "decimal").length;
  const fractions = parsedScores.filter((score) => score?.source === "fraction").length;
  const proficiency = nonEmptyValues.filter((value) => isProficiencyValue(value)).length;
  const dates = nonEmptyValues.filter((value) => isLikelyDate(value)).length;
  const text = nonEmptyValues.filter((value) => /\p{L}/u.test(value) && !parseScoreValue(value) && !isProficiencyValue(value)).length;
  const uniqueRatio = nonEmpty ? uniqueValues.size / nonEmpty : 0;

  return {
    header: column,
    normalizedHeader: normalizeHeader(column),
    nonEmpty,
    emptyRatio: sample.length ? (sample.length - nonEmpty) / sample.length : 1,
    numericRatio: nonEmpty ? numeric / nonEmpty : 0,
    percentRatio: nonEmpty ? percentages / nonEmpty : 0,
    fractionRatio: nonEmpty ? fractions / nonEmpty : 0,
    proficiencyRatio: nonEmpty ? proficiency / nonEmpty : 0,
    dateRatio: nonEmpty ? dates / nonEmpty : 0,
    uniqueRatio,
    lowCardinalityRatio: nonEmpty ? 1 - uniqueRatio : 0,
    textRatio: nonEmpty ? text / nonEmpty : 0,
  };
}

function normalizeHeader(header: string) {
  return normalizeHeaderLabel(header);
}

function isLikelyDate(value: string) {
  if (!hasObviousDateShape(value)) {
    return false;
  }

  const time = Date.parse(value);
  return Number.isFinite(time);
}

function hasObviousDateShape(value: string) {
  const trimmed = value.trim();
  if (/\b\d{4}\b/.test(trimmed)) {
    return true;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
    return true;
  }

  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) {
    return true;
  }

  return false;
}

function applyTableLevelAdjustments(inferences: ColumnInference[], rows: CsvRow[]) {
  const scoreColumns = inferences.filter((inference) => inference.selected.mappedTo === "score");
  const groupColumns = inferences.filter((inference) =>
    ["topic", "subject", "assessment", "category", "group", "term", "metricLabel", "context"].includes(
      inference.selected.mappedTo,
    ),
  );

  if (scoreColumns.length >= 2 && groupColumns.length <= 1) {
    return inferences.map((inference) => {
      if (inference.selected.mappedTo !== "score" || inference.selected.headerDerivation !== "none") {
        return inference;
      }

      const academicHint = academicHeaderHints.some((word) => normalizeHeader(inference.column).includes(word));
      const nextSelected = {
        ...inference.selected,
        confidence: Math.max(inference.selected.confidence, academicHint ? 0.78 : 0.7),
        headerDerivation: academicHint ? "category" : "metric",
        evidence: [
          ...inference.selected.evidence,
          academicHint
            ? "Multiple score columns suggest this header is a flexible category label"
            : "Multiple score columns suggest this header is a metric label",
        ],
      } satisfies FieldCandidate;

      return {
        ...inference,
        selected: nextSelected,
        candidates: promoteCandidate(inference.candidates, nextSelected),
        ambiguous: inference.ambiguous,
        requiresConfirmation: nextSelected.confidence < 0.7 || inference.ambiguous,
      };
    });
  }

  if (scoreColumns.length === 1 && groupColumns.length === 0) {
    const scoreColumn = scoreColumns[0].column;
    const hasTextColumn = inferences.some((inference) => {
      if (inference.column === scoreColumn) {
        return false;
      }

      const samples = rows.slice(0, 40).map((row) => String(row[inference.column] ?? "").trim()).filter(Boolean);
      return samples.some((sample) => /\p{L}/u.test(sample));
    });

    if (!hasTextColumn) {
      return inferences.map((inference) => {
        if (inference.column !== scoreColumn) {
          return inference;
        }

        const nextSelected = {
          ...inference.selected,
          headerDerivation: "metric",
          confidence: Math.max(inference.selected.confidence, 0.7),
          evidence: [...inference.selected.evidence, "Single score-only table will use the score header as a metric label"],
        } satisfies FieldCandidate;

        return {
          ...inference,
          selected: nextSelected,
          candidates: promoteCandidate(inference.candidates, nextSelected),
          requiresConfirmation: inference.ambiguous,
        };
      });
    }
  }

  return inferences;
}

function promoteCandidate(candidates: FieldCandidate[], selected: FieldCandidate) {
  const rest = candidates.filter((candidate) => candidate.mappedTo !== selected.mappedTo);
  return [selected, ...rest].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function isProficiencyValue(value: string) {
  const normalized = value.toLowerCase().trim();
  return [
    "mastered",
    "proficient",
    "advanced",
    "approaching",
    "developing",
    "beginning",
    "not yet",
    "exceeds",
    "meets",
    "partially meets",
    "does not meet",
    "pass",
    "fail",
    "yes",
    "no",
    "эзэмшсэн",
    "чадварлаг",
    "ахисан",
    "сайжирч байгаа",
    "эхэлж байгаа",
    "хангалттай",
    "хангалтгүй",
    "тийм",
    "үгүй",
  ].includes(normalized);
}
