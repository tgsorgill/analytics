import { scoreToPercent } from "@/lib/score";
import { isStudentIdentifierKey } from "@/lib/privacy";
import type {
  ExtraAnalyticsResult,
  ExtraAnomaly,
  ExtraArchetype,
  ExtraAssessmentSignal,
  ExtraCoverageItem,
  ExtraProgressionPoint,
  NormalizedRecord,
} from "@/lib/types";
import { clamp, round } from "@/lib/utils";

type GroupStats = {
  label: string;
  values: number[];
  records: NormalizedRecord[];
};

export function computeExtraAnalytics(records: NormalizedRecord[]): ExtraAnalyticsResult {
  const usableRecords = records.filter((record) => Number.isFinite(scoreToPercent(record.score, record.maxScore)));
  const groups = groupByDimension(usableRecords).slice(0, 28);
  const coverageItems = buildCoverage(groups, usableRecords.length);
  const relationships = buildRelationships(usableRecords, groups);
  const progression = buildProgression(usableRecords);
  const archetypes = buildArchetypes(usableRecords);
  const assessments = buildAssessmentSignals(usableRecords);
  const anomalies = buildAnomalies(coverageItems, progression.points, groups, assessments);

  return {
    generatedAt: new Date().toISOString(),
    recordCount: usableRecords.length,
    dimensionLabel: "Competency dimension",
    relationships,
    coverage: {
      items: coverageItems,
      imbalanceIndex: imbalanceIndex(coverageItems),
      overrepresented: coverageItems.filter((item) => item.status === "overrepresented").slice(0, 8),
      underrepresented: coverageItems.filter((item) => item.status === "underrepresented").slice(0, 8),
    },
    progression,
    archetypes,
    assessments,
    anomalies,
    radar: buildRadar(coverageItems, progression, relationships.links, assessments),
    limitations: buildLimitations(usableRecords, groups),
  };
}

function buildRelationships(records: NormalizedRecord[], groups: GroupStats[]): ExtraAnalyticsResult["relationships"] {
  const cohortKeys = cohortKeyList(records);
  const nodes = groups.map((group) => ({
    id: group.label,
    average: round(mean(group.values), 1),
    count: group.values.length,
  }));
  const matrix: { source: string; target: string; correlation: number }[] = [];
  const links = [];

  for (let i = 0; i < groups.length; i += 1) {
    for (let j = 0; j < groups.length; j += 1) {
      const correlation = i === j ? 1 : correlate(vectorFor(groups[i], cohortKeys), vectorFor(groups[j], cohortKeys));
      matrix.push({
        source: groups[i].label,
        target: groups[j].label,
        correlation: round(correlation, 2),
      });

      if (j > i && Math.abs(correlation) >= 0.42) {
        links.push({
          source: groups[i].label,
          target: groups[j].label,
          correlation: round(correlation, 2),
          strength: Math.abs(correlation) >= 0.7 ? "strong" : Math.abs(correlation) >= 0.55 ? "moderate" : "weak",
        } as const);
      }
    }
  }

  return {
    nodes,
    links: links.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 32),
    matrix,
    clusters: buildConceptClusters(links),
  };
}

function buildCoverage(groups: GroupStats[], total: number): ExtraCoverageItem[] {
  if (!groups.length || total === 0) {
    return [];
  }

  const expectedShare = 100 / groups.length;
  return groups
    .map((group) => {
      const share = (group.values.length / total) * 100;
      return {
        label: group.label,
        count: group.values.length,
        share: round(share, 1),
        average: round(mean(group.values), 1),
        status:
          share > expectedShare * 1.65
            ? "overrepresented"
            : share < expectedShare * 0.45
              ? "underrepresented"
              : "balanced",
      } satisfies ExtraCoverageItem;
    })
    .sort((a, b) => b.count - a.count);
}

function buildProgression(records: NormalizedRecord[]): ExtraAnalyticsResult["progression"] {
  const groups = groupByTime(records);
  const points = groups.map((group, index) => {
    const window = groups.slice(Math.max(0, index - 2), index + 1).flatMap((item) => item.values);
    return {
      label: group.label,
      average: round(mean(group.values), 1),
      rollingAverage: round(mean(window), 1),
      volatility: round(standardDeviation(group.values), 1),
      count: group.values.length,
    } satisfies ExtraProgressionPoint;
  });

  const slope = points.length > 1 ? linearSlope(points.map((point, index) => [index, point.rollingAverage])) : 0;
  const change = points.length > 1 ? points[points.length - 1].rollingAverage - points[0].rollingAverage : 0;
  return {
    points,
    direction: points.length < 2 ? "insufficient_data" : change >= 1.5 || (slope >= 0.45 && change > 0) ? "improving" : change <= -1.5 || (slope <= -0.45 && change < 0) ? "declining" : "flat",
    instabilityIndex: round(mean(points.map((point) => point.volatility)), 1),
  };
}

function buildArchetypes(records: NormalizedRecord[]): ExtraArchetype[] {
  const cohorts = groupByCohort(records)
    .map((group) => {
      const trend = group.records.length > 1 ? linearSlope(group.records.map((record, index) => [index, scoreToPercent(record.score, record.maxScore)])) : 0;
      return {
        average: mean(group.values),
        volatility: standardDeviation(group.values),
        trend,
      };
    })
    .filter((item) => Number.isFinite(item.average));

  const definitions = [
    {
      id: "highConsistency",
      label: "High consistency cohort",
      filter: (item: (typeof cohorts)[number]) => item.volatility < 8 && item.average >= 75,
      description: "Aggregate records show stable outcomes with limited score spread.",
    },
    {
      id: "volatile",
      label: "Volatile cohort",
      filter: (item: (typeof cohorts)[number]) => item.volatility >= 16,
      description: "Aggregate records show wider swings across observations.",
    },
    {
      id: "improving",
      label: "Improving cohort",
      filter: (item: (typeof cohorts)[number]) => item.trend > 0.6,
      description: "Aggregate trajectory trends upward across available observations.",
    },
    {
      id: "fragmented",
      label: "Fragmented mastery cohort",
      filter: (item: (typeof cohorts)[number]) => item.average < 75 && item.volatility >= 10,
      description: "Aggregate mastery appears uneven across dimensions or assessments.",
    },
  ];

  return definitions.map((definition) => {
    const members = cohorts.filter(definition.filter);
    return {
      id: definition.id,
      label: definition.label,
      count: members.length,
      share: cohorts.length ? round((members.length / cohorts.length) * 100, 1) : 0,
      average: round(mean(members.map((member) => member.average)), 1),
      volatility: round(mean(members.map((member) => member.volatility)), 1),
      trend: round(mean(members.map((member) => member.trend)), 2),
      description: definition.description,
    };
  });
}

function buildAssessmentSignals(records: NormalizedRecord[]): ExtraAssessmentSignal[] {
  const groups = groupBy(records, assessmentLabel);

  return groups
    .map((group) => {
      const dimensionCount = new Set(group.records.map(dimensionLabel)).size;
      const counts = Array.from(countBy(group.records.map(dimensionLabel)).values());
      const concentration = counts.length ? Math.max(...counts) / group.records.length : 0;
      const variance = standardDeviation(group.values) ** 2;
      const flags = [
        ...(variance >= 300 ? ["high variance"] : []),
        ...(concentration >= 0.7 && group.records.length >= 5 ? ["concentrated focus"] : []),
        ...(dimensionCount <= 1 && group.records.length >= 5 ? ["low competency diversity"] : []),
      ];

      return {
        label: group.label,
        count: group.values.length,
        average: round(mean(group.values), 1),
        variance: round(variance, 1),
        topicDiversity: dimensionCount,
        concentration: round(concentration * 100, 1),
        flags,
      };
    })
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 16);
}

function buildAnomalies(
  coverageItems: ExtraCoverageItem[],
  progression: ExtraProgressionPoint[],
  groups: GroupStats[],
  assessments: ExtraAssessmentSignal[],
): ExtraAnomaly[] {
  const anomalies: ExtraAnomaly[] = [];

  for (let i = 1; i < progression.length; i += 1) {
    const swing = progression[i].average - progression[i - 1].average;
    if (Math.abs(swing) >= 12) {
      anomalies.push({
        label: progression[i].label,
        type: "swing",
        severity: round(Math.abs(swing), 1),
        description: `Aggregate average shifted ${round(swing, 1)} points from the previous period.`,
      });
    }
  }

  for (const group of groups) {
    const volatility = standardDeviation(group.values);
    if (volatility >= 18 && group.values.length >= 5) {
      anomalies.push({
        label: group.label,
        type: "volatility",
        severity: round(volatility, 1),
        description: "This dimension has a high score spread. Treat as a statistical flag, not a cause.",
      });
    }
  }

  for (const item of coverageItems) {
    if (item.status !== "balanced") {
      anomalies.push({
        label: item.label,
        type: "coverage",
        severity: item.status === "overrepresented" ? item.share : 100 - item.share,
        description:
          item.status === "overrepresented"
            ? "This dimension appears more frequently than the rest of the curriculum map."
            : "This dimension appears less frequently than the rest of the curriculum map.",
      });
    }
  }

  for (const assessment of assessments) {
    if (assessment.flags.includes("high variance")) {
      anomalies.push({
        label: assessment.label,
        type: "polarization",
        severity: assessment.variance,
        description: "This assessment has an unusually wide score distribution.",
      });
    }
  }

  return anomalies.sort((a, b) => b.severity - a.severity).slice(0, 18);
}

function buildRadar(
  coverage: ExtraCoverageItem[],
  progression: ExtraAnalyticsResult["progression"],
  links: ExtraAnalyticsResult["relationships"]["links"],
  assessments: ExtraAssessmentSignal[],
) {
  const balance = clamp(100 - imbalanceIndex(coverage) * 100, 0, 100);
  const stability = clamp(100 - progression.instabilityIndex, 0, 100);
  const relationshipDensity = clamp(links.length * 8, 0, 100);
  const assessmentDiversity = clamp(mean(assessments.map((item) => item.topicDiversity)) * 18, 0, 100);

  return [
    { metric: "Coverage balance", value: round(balance, 1) },
    { metric: "Momentum stability", value: round(stability, 1) },
    { metric: "Relationship density", value: round(relationshipDensity, 1) },
    { metric: "Assessment diversity", value: round(assessmentDiversity, 1) },
    { metric: "Signal confidence", value: round(clamp((coverage.length / 8) * 100, 0, 100), 1) },
  ];
}

function groupByDimension(records: NormalizedRecord[]) {
  return groupBy(records, dimensionLabel)
    .filter((group) => group.label !== "Unspecified")
    .sort((a, b) => b.values.length - a.values.length);
}

function groupByCohort(records: NormalizedRecord[]) {
  return groupBy(records, cohortKey);
}

function groupByTime(records: NormalizedRecord[]) {
  const datedGroups = groupBy(
    records.filter((record) => record.date),
    (record) => record.date ?? "Undated",
  ).sort((a, b) => a.label.localeCompare(b.label));

  if (datedGroups.length >= 2) {
    return datedGroups;
  }

  const progressionGroups = groupByProgressionLabel(records);
  if (progressionGroups.length >= 2) {
    return progressionGroups;
  }

  const bucketCount = Math.min(8, Math.max(2, Math.ceil(records.length / 25)));
  const bucketSize = Math.max(1, Math.ceil(records.length / bucketCount));
  const buckets = new Map<string, NormalizedRecord[]>();
  records.forEach((record, index) => {
    const bucketIndex = Math.floor(index / bucketSize);
    const bucket = bucketCount === 2 ? (bucketIndex === 0 ? "Earlier records" : "Later records") : `Segment ${bucketIndex + 1}`;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), record]);
  });

  return Array.from(buckets.entries()).map(([label, bucketRecords]) => toGroup(label, bucketRecords));
}

function groupByProgressionLabel(records: NormalizedRecord[]) {
  const groups = new Map<string, NormalizedRecord[]>();
  const orderedLabels: string[] = [];

  records.forEach((record) => {
    const label = progressionLabel(record);
    if (!label) {
      return;
    }

    if (!groups.has(label)) {
      orderedLabels.push(label);
    }
    groups.set(label, [...(groups.get(label) ?? []), record]);
  });

  if (!hasOrderedProgressionLabels(orderedLabels)) {
    return [];
  }

  return orderedLabels.map((label) => toGroup(label, groups.get(label) ?? []));
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

function groupBy(records: NormalizedRecord[], labeler: (record: NormalizedRecord, index: number) => string) {
  const groups = new Map<string, NormalizedRecord[]>();
  records.forEach((record, index) => {
    const label = labeler(record, index) || "Unspecified";
    groups.set(label, [...(groups.get(label) ?? []), record]);
  });

  return Array.from(groups.entries()).map(([label, groupRecords]) => toGroup(label, groupRecords));
}

function toGroup(label: string, records: NormalizedRecord[]): GroupStats {
  return {
    label,
    records,
    values: records.map((record) => scoreToPercent(record.score, record.maxScore)).filter(Number.isFinite),
  };
}

function dimensionLabel(record: NormalizedRecord) {
  return (
    safeLabel(record.topic, record) ??
    safeLabel(record.metricName, record) ??
    safeLabel(record.assessment, record) ??
    firstDimension(record) ??
    safeLabel(record.subject, record) ??
    "Unspecified"
  );
}

function assessmentLabel(record: NormalizedRecord) {
  return record.assessment ?? record.metricName ?? record.term ?? record.date ?? "Assessment set";
}

function firstDimension(record: NormalizedRecord) {
  return Object.entries(record.dimensions ?? {})
    .filter(([key, value]) => value.trim() && !isStudentIdentifierKey(key))
    .map(([, value]) => safeLabel(value, record))
    .filter(Boolean)[0];
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

function cohortKey(record: NormalizedRecord, index: number) {
  return record.studentId ?? record.studentName ?? `${record.subject ?? "cohort"}:${record.term ?? record.date ?? Math.floor(index / 4)}`;
}

function cohortKeyList(records: NormalizedRecord[]) {
  return Array.from(new Set(records.map(cohortKey)));
}

function vectorFor(group: GroupStats, keys: string[]) {
  const byKey = new Map<string, number[]>();
  group.records.forEach((record, index) => {
    const key = cohortKey(record, index);
    byKey.set(key, [...(byKey.get(key) ?? []), scoreToPercent(record.score, record.maxScore)]);
  });

  return keys.map((key) => {
    const values = byKey.get(key);
    return values?.length ? mean(values) : Number.NaN;
  });
}

function buildConceptClusters(links: ExtraAnalyticsResult["relationships"]["links"]) {
  const clusters: { label: string; members: Set<string>; correlations: number[] }[] = [];

  for (const link of links.filter((item) => Math.abs(item.correlation) >= 0.55)) {
    const existing = clusters.find((cluster) => cluster.members.has(link.source) || cluster.members.has(link.target));
    if (existing) {
      existing.members.add(link.source);
      existing.members.add(link.target);
      existing.correlations.push(Math.abs(link.correlation));
    } else {
      clusters.push({
        label: `Cluster ${clusters.length + 1}`,
        members: new Set([link.source, link.target]),
        correlations: [Math.abs(link.correlation)],
      });
    }
  }

  return clusters.map((cluster) => ({
    label: cluster.label,
    members: Array.from(cluster.members),
    averageCorrelation: round(mean(cluster.correlations), 2),
  }));
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function imbalanceIndex(items: ExtraCoverageItem[]) {
  if (!items.length) {
    return 0;
  }

  const expected = 100 / items.length;
  return round(mean(items.map((item) => Math.abs(item.share - expected) / expected)), 2);
}

function correlate(left: number[], right: number[]) {
  const pairs = left
    .map((value, index) => [value, right[index]])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

  if (pairs.length < 3) {
    return 0;
  }

  const leftMean = mean(pairs.map(([a]) => a));
  const rightMean = mean(pairs.map(([, b]) => b));
  const numerator = pairs.reduce((sum, [a, b]) => sum + (a - leftMean) * (b - rightMean), 0);
  const leftVariance = pairs.reduce((sum, [a]) => sum + (a - leftMean) ** 2, 0);
  const rightVariance = pairs.reduce((sum, [, b]) => sum + (b - rightMean) ** 2, 0);
  const denominator = Math.sqrt(leftVariance * rightVariance);

  return denominator ? numerator / denominator : 0;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
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
  return denominator ? (n * sumXY - sumX * sumY) / denominator : 0;
}

function buildLimitations(records: NormalizedRecord[], groups: GroupStats[]) {
  const limitations: string[] = [];
  if (!records.some((record) => record.studentId || record.studentName)) {
    limitations.push("Anonymous cohort archetypes use available aggregate segments because no student identifier was mapped.");
  }
  if (!records.some((record) => record.date)) {
    limitations.push("Progression uses upload order segments because no date field was mapped.");
  }
  if (groups.length < 3) {
    limitations.push("Relationship maps need at least three dimensions for stronger statistical signal.");
  }
  return limitations;
}
