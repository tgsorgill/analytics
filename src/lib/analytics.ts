import { scoreToPercent } from "@/lib/score";
import { isStudentIdentifierKey } from "@/lib/privacy";
import type {
  AnalyticsResult,
  Cluster,
  DistributionBin,
  NormalizedRecord,
  SubjectStat,
  TopicStat,
  TrendSignal,
  TrendPoint,
  VarianceItem,
} from "@/lib/types";
import { clamp, round } from "@/lib/utils";

const masteryThreshold = 80;

export function computeAnalytics(records: NormalizedRecord[]): AnalyticsResult {
  const percentages = records.map((record) => scoreToPercent(record.score, record.maxScore)).filter(Number.isFinite);
  if (!percentages.length) {
    return emptyAnalytics(records);
  }

  const topicStats = groupStats(records, "topic").map(toTopicStat).sort((a, b) => a.average - b.average);
  const subjectComparisons = groupStats(records, "subject")
    .map(toSubjectStat)
    .sort((a, b) => b.average - a.average);
  const weakTopics = topicStats.slice(0, 5);
  const strongTopics = [...topicStats].sort((a, b) => b.average - a.average).slice(0, 5);
  const distribution = buildDistribution(percentages);
  const trendPoints = buildTrend(records);
  const overallTrendSignal = buildTrendSignal("Overall classroom", trendPoints);
  const trend = {
    points: trendPoints,
    slope: trendPoints.length > 1 ? round(linearSlope(trendPoints.map((point, index) => [index, point.average])), 2) : 0,
    direction: trendDirection(trendPoints),
    firstAverage: overallTrendSignal.firstAverage,
    latestAverage: overallTrendSignal.latestAverage,
    change: overallTrendSignal.change,
  } as const;
  const topicTrendSignals = buildTopicTrendSignals(records);
  const clusters = buildClusters(percentages);
  const masteryBreakdown = clusters.map((cluster) => ({
    label: cluster.label,
    count: cluster.count,
    percentage: percentages.length ? round((cluster.count / percentages.length) * 100, 1) : 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    recordCount: percentages.length,
    overview: {
      mean: round(mean(percentages), 2),
      median: round(median(percentages), 2),
      mode: mode(percentages).map((value) => round(value, 2)),
      standardDeviation: round(standardDeviation(percentages), 2),
      min: round(Math.min(...percentages), 2),
      max: round(Math.max(...percentages), 2),
      consistencyScore: consistencyScore(percentages),
      masteryRate: masteryRate(percentages),
    },
    weakTopics,
    strongTopics,
    topicStats,
    subjectComparisons,
    distribution,
    trend,
    trendSignals: {
      overall: overallTrendSignal,
      byTopic: topicTrendSignals,
      improving: topicTrendSignals.filter((signal) => signal.direction === "improving").slice(0, 6),
      declining: topicTrendSignals.filter((signal) => signal.direction === "declining").slice(0, 6),
    },
    variance: {
      byTopic: groupStats(records, "topic")
        .map(toVarianceItem)
        .sort((a, b) => b.variance - a.variance)
        .slice(0, 8),
      bySubject: groupStats(records, "subject")
        .map(toVarianceItem)
        .sort((a, b) => b.variance - a.variance)
        .slice(0, 8),
    },
    clusters,
    masteryBreakdown,
    chartData: {
      topicPerformance: topicStats.map((topic) => ({
        topic: topic.topic,
        average: topic.average,
        masteryRate: topic.masteryRate,
        count: topic.count,
      })),
      subjectComparison: subjectComparisons.map((subject) => ({
        subject: subject.subject,
        average: subject.average,
        masteryRate: subject.masteryRate,
        count: subject.count,
      })),
      distribution,
      trend: trendPoints,
      clusters,
    },
    limitations: buildLimitations(records),
  };
}

function emptyAnalytics(records: NormalizedRecord[]): AnalyticsResult {
  const distribution = buildDistribution([]);
  const clusters = buildClusters([]);

  return {
    generatedAt: new Date().toISOString(),
    recordCount: 0,
    overview: {
      mean: 0,
      median: 0,
      mode: [],
      standardDeviation: 0,
      min: 0,
      max: 0,
      consistencyScore: 0,
      masteryRate: 0,
    },
    weakTopics: [],
    strongTopics: [],
    topicStats: [],
    subjectComparisons: [],
    distribution,
    trend: {
      points: [],
      slope: 0,
      direction: "insufficient_data",
      firstAverage: 0,
      latestAverage: 0,
      change: 0,
    },
    trendSignals: {
      overall: emptyTrendSignal("Overall classroom"),
      byTopic: [],
      improving: [],
      declining: [],
    },
    variance: {
      byTopic: [],
      bySubject: [],
    },
    clusters,
    masteryBreakdown: clusters.map((cluster) => ({
      label: cluster.label,
      count: cluster.count,
      percentage: 0,
    })),
    chartData: {
      topicPerformance: [],
      subjectComparison: [],
      distribution,
      trend: [],
      clusters,
    },
    limitations: ["No parseable score records were available.", ...buildLimitations(records)],
  };
}

function groupStats(records: NormalizedRecord[], field: "topic" | "subject") {
  const groups = new Map<string, number[]>();

  for (const record of records) {
    const key = groupLabel(record, field);
    const value = scoreToPercent(record.score, record.maxScore);
    if (!Number.isFinite(value)) {
      continue;
    }

    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return Array.from(groups.entries()).map(([label, values]) => ({
    label,
    values,
  }));
}

function toTopicStat(group: { label: string; values: number[] }): TopicStat {
  return {
    topic: group.label,
    count: group.values.length,
    average: round(mean(group.values), 2),
    median: round(median(group.values), 2),
    masteryRate: masteryRate(group.values),
    standardDeviation: round(standardDeviation(group.values), 2),
    consistencyScore: consistencyScore(group.values),
  };
}

function toSubjectStat(group: { label: string; values: number[] }): SubjectStat {
  return {
    subject: group.label,
    count: group.values.length,
    average: round(mean(group.values), 2),
    masteryRate: masteryRate(group.values),
    standardDeviation: round(standardDeviation(group.values), 2),
  };
}

function toVarianceItem(group: { label: string; values: number[] }): VarianceItem {
  const std = standardDeviation(group.values);

  return {
    label: group.label,
    count: group.values.length,
    variance: round(std * std, 2),
    standardDeviation: round(std, 2),
  };
}

function buildDistribution(values: number[]): DistributionBin[] {
  const bins: DistributionBin[] = [
    { label: "0-59", min: 0, max: 59, count: 0 },
    { label: "60-69", min: 60, max: 69, count: 0 },
    { label: "70-79", min: 70, max: 79, count: 0 },
    { label: "80-89", min: 80, max: 89, count: 0 },
    { label: "90-100", min: 90, max: 100, count: 0 },
  ];

  for (const value of values) {
    const boundedValue = clamp(value, 0, 100);
    const bin = bins.find((candidate) => boundedValue >= candidate.min && boundedValue <= candidate.max) ?? bins[bins.length - 1];
    bin.count += 1;
  }

  return bins;
}

function buildTrend(records: NormalizedRecord[]): TrendPoint[] {
  const groups = buildChronologicalGroups(records);

  return groups
    .map(([date, values]) => ({
      date,
      average: round(mean(values), 2),
      count: values.length,
    }));
}

function buildChronologicalGroups(records: NormalizedRecord[]): [string, number[]][] {
  const datedGroups = new Map<string, number[]>();

  for (const record of records) {
    if (!record.date) {
      continue;
    }

    const value = scoreToPercent(record.score, record.maxScore);
    if (Number.isFinite(value)) {
      datedGroups.set(record.date, [...(datedGroups.get(record.date) ?? []), value]);
    }
  }

  if (datedGroups.size >= 2) {
    return Array.from(datedGroups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  const progressionGroups = buildProgressionLabelGroups(records);
  if (progressionGroups.length >= 2) {
    return progressionGroups;
  }

  const usableValues = records.map((record) => scoreToPercent(record.score, record.maxScore)).filter(Number.isFinite);
  if (usableValues.length < 2) {
    return [];
  }

  const bucketCount = Math.min(8, Math.max(2, Math.ceil(usableValues.length / 25)));
  const bucketSize = Math.ceil(usableValues.length / bucketCount);
  const buckets = new Map<string, number[]>();

  usableValues.forEach((value, index) => {
    const bucketIndex = Math.floor(index / bucketSize);
    const label = bucketCount === 2 ? (bucketIndex === 0 ? "Earlier records" : "Later records") : `Segment ${bucketIndex + 1}`;
    buckets.set(label, [...(buckets.get(label) ?? []), value]);
  });

  return Array.from(buckets.entries());
}

function trendDirection(points: TrendPoint[]): AnalyticsResult["trend"]["direction"] {
  if (points.length < 2) {
    return "insufficient_data";
  }

  const slope = linearSlope(points.map((point, index) => [index, point.average]));
  const first = points[0];
  const latest = points[points.length - 1];
  const change = latest.average - first.average;

  if (change >= 1.5 || (slope >= 0.45 && change > 0)) {
    return "improving";
  }

  if (change <= -1.5 || (slope <= -0.45 && change < 0)) {
    return "declining";
  }

  return "flat";
}

function buildProgressionLabelGroups(records: NormalizedRecord[]): [string, number[]][] {
  const groups = new Map<string, number[]>();
  const orderedLabels: string[] = [];

  for (const record of records) {
    const label = progressionLabel(record);
    const value = scoreToPercent(record.score, record.maxScore);
    if (!label || !Number.isFinite(value)) {
      continue;
    }

    if (!groups.has(label)) {
      orderedLabels.push(label);
    }
    groups.set(label, [...(groups.get(label) ?? []), value]);
  }

  if (!hasOrderedProgressionLabels(orderedLabels)) {
    return [];
  }

  return orderedLabels.map((label) => [label, groups.get(label) ?? []]);
}

function progressionLabel(record: NormalizedRecord) {
  const label = safeLabel(record.assessment, record) ?? safeLabel(record.metricName, record) ?? safeLabel(record.term, record);
  if (label) {
    return label;
  }

  const topic = safeLabel(record.topic, record);
  return topic && isProgressionLikeLabel(topic) ? topic : undefined;
}

function hasOrderedProgressionLabels(labels: string[]) {
  const uniqueLabels = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
  if (uniqueLabels.length < 2) {
    return false;
  }

  const progressionLikeCount = uniqueLabels.filter(isProgressionLikeLabel).length;
  const orderedNumberCount = uniqueLabels.filter((label) => extractOrderNumber(label) !== null).length;
  const hasPrePostPair = uniqueLabels.some((label) => /\bpre\b|өмнөх|эхний/i.test(label)) && uniqueLabels.some((label) => /\bpost\b|\bfinal\b|дараах|сүүлийн|эцсийн/i.test(label));

  return progressionLikeCount >= 2 || orderedNumberCount >= 2 || hasPrePostPair;
}

function isProgressionLikeLabel(label: string) {
  const normalized = label.toLowerCase();
  const hasSequenceNumber = extractOrderNumber(normalized) !== null;
  const hasProgressionWord =
    /\b(quiz|test|exam|assessment|assignment|homework|week|unit|lesson|module|segment|part|section|term|semester|quarter|checkpoint|attempt|cycle|round)\b/i.test(normalized) ||
    /(сорил|шалгалт|үнэлгээ|даалгавар|долоо хоног|хэсэг|нэгж|сэдэв|улирал|оролдлого|шат|модуль)/i.test(normalized);
  const hasTemporalWord = /\b(pre|post|baseline|midterm|final|early|later|latest)\b/i.test(normalized) || /(өмнөх|дараах|эхний|сүүлийн|эцсийн|дундын)/i.test(normalized);

  return (hasSequenceNumber && hasProgressionWord) || hasTemporalWord;
}

function extractOrderNumber(label: string) {
  const match = label.match(/(?:^|[^\d])(\d{1,4})(?:[^\d]|$)/);
  return match ? Number(match[1]) : null;
}

function buildTopicTrendSignals(records: NormalizedRecord[]) {
  const groups = new Map<string, NormalizedRecord[]>();

  for (const record of records) {
    const label = groupLabel(record, "topic");
    groups.set(label, [...(groups.get(label) ?? []), record]);
  }

  return Array.from(groups.entries())
    .map(([label, groupRecords]) => buildTrendSignal(label, buildTrend(groupRecords)))
    .filter((signal) => signal.points >= 2 && signal.count >= 2)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

function buildTrendSignal(label: string, points: TrendPoint[]): TrendSignal {
  if (points.length < 2) {
    return emptyTrendSignal(label);
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const change = round(latest.average - first.average, 1);

  return {
    label,
    firstLabel: first.date,
    latestLabel: latest.date,
    firstAverage: first.average,
    latestAverage: latest.average,
    change,
    direction: trendDirection(points),
    points: points.length,
    count: points.reduce((sum, point) => sum + point.count, 0),
  };
}

function emptyTrendSignal(label: string): TrendSignal {
  return {
    label,
    firstLabel: "",
    latestLabel: "",
    firstAverage: 0,
    latestAverage: 0,
    change: 0,
    direction: "insufficient_data",
    points: 0,
    count: 0,
  };
}

function buildClusters(values: number[]): Cluster[] {
  const definitions: Omit<Cluster, "count" | "average">[] = [
    { id: "needsSupport", label: "Needs support", min: 0, max: 59 },
    { id: "approaching", label: "Approaching", min: 60, max: 74 },
    { id: "proficient", label: "Proficient", min: 75, max: 89 },
    { id: "advanced", label: "Advanced", min: 90, max: Number.POSITIVE_INFINITY },
  ];

  return definitions.map((definition) => {
    const clusterValues = values.filter((value) => value >= definition.min && value <= definition.max);

    return {
      ...definition,
      count: clusterValues.length,
      average: round(mean(clusterValues), 2),
    };
  });
}

function buildLimitations(records: NormalizedRecord[]) {
  const limitations: string[] = [];

  if (!records.some((record) => record.topic || record.metricName || record.assessment || firstDimension(record))) {
    limitations.push("Category-level analytics are limited because no grouping field was mapped.");
  }

  if (!records.some((record) => record.subject || record.term || record.assessment || firstDimension(record))) {
    limitations.push("Comparison analytics are limited because no subject, term, assessment, or grouping field was mapped.");
  }

  if (!records.some((record) => record.date)) {
    limitations.push("Trend analytics use upload-order segments because no date field was mapped.");
  }

  if (records.length < 10) {
    limitations.push("Small datasets can produce unstable variance and clustering results.");
  }

  return limitations;
}

function groupLabel(record: NormalizedRecord, field: "topic" | "subject") {
  if (field === "topic") {
    return (
      safeLabel(record.topic, record) ||
      safeLabel(record.metricName, record) ||
      safeLabel(record.assessment, record) ||
      firstDimension(record) ||
      "Unspecified"
    );
  }

  return (
    safeLabel(record.subject, record) ||
    safeLabel(record.term, record) ||
    safeLabel(record.assessment, record) ||
    firstDimension(record) ||
    "Unspecified"
  );
}

function firstDimension(record: NormalizedRecord) {
  const values = Object.entries(record.dimensions ?? {})
    .filter(([key, value]) => value.trim() && !isStudentIdentifierKey(key))
    .map(([, value]) => safeLabel(value, record))
    .filter(Boolean);
  return values[0];
}

function safeLabel(value: string | undefined, record: NormalizedRecord) {
  const label = value?.trim();
  if (!label) {
    return undefined;
  }

  if (label === record.studentName?.trim() || label === record.studentId?.trim()) {
    return undefined;
  }

  return label;
}

function mean(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
}

function mode(values: number[]) {
  if (!values.length) {
    return [];
  }

  const roundedValues = values.map((value) => round(value, 0));
  const counts = new Map<number, number>();
  for (const value of roundedValues) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const max = Math.max(...counts.values());
  if (max <= 1) {
    return [];
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([value]) => value)
    .slice(0, 5);
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function masteryRate(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return round((values.filter((value) => value >= masteryThreshold).length / values.length) * 100, 1);
}

function consistencyScore(values: number[]) {
  return round(clamp(100 - standardDeviation(values), 0, 100), 1);
}

function linearSlope(points: number[][]) {
  const n = points.length;
  if (n < 2) {
    return 0;
  }

  const sumX = points.reduce((sum, [x]) => sum + x, 0);
  const sumY = points.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumX2 = points.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sumX2 - sumX ** 2;

  if (denominator === 0) {
    return 0;
  }

  return (n * sumXY - sumX * sumY) / denominator;
}
