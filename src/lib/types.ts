import { z } from "zod";
import type { Locale } from "@/lib/i18n";

export const internalFields = [
  "studentId",
  "studentName",
  "subject",
  "assessment",
  "topic",
  "category",
  "group",
  "term",
  "metricLabel",
  "context",
  "notes",
  "score",
  "maxScore",
  "date",
  "ignore",
] as const;

export type InternalField = (typeof internalFields)[number];

export const criticalFields: InternalField[] = ["score"];

export const fieldLabels: Record<InternalField, string> = {
  studentId: "Student ID",
  studentName: "Student name",
  subject: "Subject",
  assessment: "Assessment",
  topic: "Topic",
  category: "Category / standard",
  group: "Class / group",
  term: "Term / period",
  metricLabel: "Metric label",
  context: "Context",
  notes: "Notes",
  score: "Score",
  maxScore: "Max score",
  date: "Date",
  ignore: "Ignore",
};

export type HeaderDerivation = "none" | "topic" | "assessment" | "subject" | "category" | "metric";

export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  fileName: string;
  columns: string[];
  rows: CsvRow[];
  rowCount: number;
  parseErrors: string[];
  truncated: boolean;
  detectedHeaderRow: number;
  headerConfidence: number;
  structureNotes: string[];
};

export type FieldCandidate = {
  mappedTo: InternalField;
  confidence: number;
  evidence: string[];
  headerDerivation?: HeaderDerivation;
};

export type ColumnInference = {
  column: string;
  samples: string[];
  candidates: FieldCandidate[];
  selected: FieldCandidate;
  ambiguous: boolean;
  requiresConfirmation: boolean;
};

export type ColumnMapping = {
  column: string;
  field: InternalField;
  confidence: number;
  confirmed: boolean;
  headerDerivation: HeaderDerivation;
  evidence: string[];
};

export type MappingValidation = {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
  needsConfirmation: string[];
};

export const NormalizedRecordSchema = z.object({
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  subject: z.string().optional(),
  assessment: z.string().optional(),
  topic: z.string().optional(),
  term: z.string().optional(),
  metricName: z.string().optional(),
  dimensions: z.record(z.string(), z.string()).optional(),
  score: z.number().finite(),
  maxScore: z.number().positive().finite().optional(),
  date: z.string().optional(),
});

export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;

export type NormalizationIssue = {
  rowNumber: number;
  column?: string;
  message: string;
};

export type NormalizationResult = {
  records: NormalizedRecord[];
  issues: NormalizationIssue[];
  warnings: string[];
  summary: {
    sourceRows: number;
    normalizedRecords: number;
    skippedValues: number;
    scoreColumns: number;
  };
};

export type TopicStat = {
  topic: string;
  count: number;
  average: number;
  median: number;
  masteryRate: number;
  standardDeviation: number;
  consistencyScore: number;
};

export type SubjectStat = {
  subject: string;
  count: number;
  average: number;
  masteryRate: number;
  standardDeviation: number;
};

export type DistributionBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export type TrendPoint = {
  date: string;
  average: number;
  count: number;
};

export type TrendDirection = "improving" | "declining" | "flat" | "insufficient_data";

export type TrendSignal = {
  label: string;
  firstLabel: string;
  latestLabel: string;
  firstAverage: number;
  latestAverage: number;
  change: number;
  direction: TrendDirection;
  points: number;
  count: number;
};

export type Cluster = {
  id: "needsSupport" | "approaching" | "proficient" | "advanced";
  label: string;
  min: number;
  max: number;
  count: number;
  average: number;
};

export type VarianceItem = {
  label: string;
  count: number;
  variance: number;
  standardDeviation: number;
};

export type AnalyticsResult = {
  generatedAt: string;
  recordCount: number;
  overview: {
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
    min: number;
    max: number;
    consistencyScore: number;
    masteryRate: number;
  };
  weakTopics: TopicStat[];
  strongTopics: TopicStat[];
  topicStats: TopicStat[];
  subjectComparisons: SubjectStat[];
  distribution: DistributionBin[];
  trend: {
    points: TrendPoint[];
    slope: number;
    direction: TrendDirection;
    firstAverage: number;
    latestAverage: number;
    change: number;
  };
  trendSignals: {
    overall: TrendSignal;
    byTopic: TrendSignal[];
    improving: TrendSignal[];
    declining: TrendSignal[];
  };
  variance: {
    byTopic: VarianceItem[];
    bySubject: VarianceItem[];
  };
  clusters: Cluster[];
  masteryBreakdown: {
    label: string;
    count: number;
    percentage: number;
  }[];
  chartData: {
    topicPerformance: { topic: string; average: number; masteryRate: number; count: number }[];
    subjectComparison: { subject: string; average: number; masteryRate: number; count: number }[];
    distribution: DistributionBin[];
    trend: TrendPoint[];
    clusters: Cluster[];
  };
  limitations: string[];
};

export type AiInsight = {
  summary: string;
  trends: string[];
  instructionalFocus: string[];
  cautions: string[];
  chartSuggestions: {
    type: string;
    title: string;
    rationale: string;
    priority?: number;
  }[];
  rawText?: string;
};

export type AiRequest = {
  token: string;
  model: string;
  analytics: AnalyticsResult;
  locale?: Locale;
};

export type ExtraAiRequest = {
  token: string;
  model: string;
  extraAnalytics: ExtraAnalyticsResult;
  locale?: Locale;
};

export type ExtraRelationship = {
  source: string;
  target: string;
  correlation: number;
  strength: "weak" | "moderate" | "strong";
};

export type ExtraCoverageItem = {
  label: string;
  count: number;
  share: number;
  average: number;
  status: "underrepresented" | "balanced" | "overrepresented";
};

export type ExtraProgressionPoint = {
  label: string;
  average: number;
  rollingAverage: number;
  volatility: number;
  count: number;
};

export type ExtraArchetype = {
  id: string;
  label: string;
  count: number;
  share: number;
  average: number;
  volatility: number;
  trend: number;
  description: string;
};

export type ExtraAssessmentSignal = {
  label: string;
  count: number;
  average: number;
  variance: number;
  topicDiversity: number;
  concentration: number;
  flags: string[];
};

export type ExtraAnomaly = {
  label: string;
  type: "swing" | "volatility" | "polarization" | "coverage";
  severity: number;
  description: string;
};

export type ExtraAnalyticsResult = {
  generatedAt: string;
  recordCount: number;
  dimensionLabel: string;
  relationships: {
    nodes: { id: string; average: number; count: number }[];
    links: ExtraRelationship[];
    matrix: { source: string; target: string; correlation: number }[];
    clusters: { label: string; members: string[]; averageCorrelation: number }[];
  };
  coverage: {
    items: ExtraCoverageItem[];
    imbalanceIndex: number;
    overrepresented: ExtraCoverageItem[];
    underrepresented: ExtraCoverageItem[];
  };
  progression: {
    points: ExtraProgressionPoint[];
    direction: "improving" | "declining" | "flat" | "insufficient_data";
    instabilityIndex: number;
  };
  archetypes: ExtraArchetype[];
  assessments: ExtraAssessmentSignal[];
  anomalies: ExtraAnomaly[];
  radar: { metric: string; value: number }[];
  limitations: string[];
};

export type ArchitectureDoc = {
  sections: {
    title: string;
    body: string[];
  }[];
};
