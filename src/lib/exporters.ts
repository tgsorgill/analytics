"use client";

import { jsPDF } from "jspdf";
import { localizeDirection, localizeLabel, t, type Locale } from "@/lib/i18n";
import { scoreToPercent } from "@/lib/score";
import type { AiInsight, AnalyticsResult, ColumnMapping, ExtraAnalyticsResult, NormalizationResult, NormalizedRecord, TrendDirection } from "@/lib/types";
import { downloadJson, downloadText, safeFilename } from "@/lib/utils";

export type StudentCoveragePdfData = {
  key: string;
  label: string;
  secondaryLabel: string;
  records: NormalizedRecord[];
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  masteryRate: number;
  consistencyScore: number;
  standardDeviation: number;
  trend: {
    direction: TrendDirection;
    change: number;
    firstAverage: number;
    latestAverage: number;
    points: { label: string; average: number; count: number }[];
  };
  strongest: StudentCoverageGroup[];
  weakest: StudentCoverageGroup[];
  coverage: StudentCoverageGroup[];
  subjects: StudentCoverageGroup[];
  distribution: { label: string; count: number }[];
};

type StudentCoverageGroup = {
  label: string;
  count: number;
  average: number;
  masteryRate: number;
};

export function exportNormalizedDataset(fileName: string, normalized: NormalizationResult) {
  downloadJson(`${safeFilename(fileName)}-normalized.json`, {
    exportedAt: new Date().toISOString(),
    privacy: "Browser-only export created locally by the teacher.",
    normalized,
  });
}

export function exportAnalytics(fileName: string, analytics: AnalyticsResult, mappings: ColumnMapping[]) {
  downloadJson(`${safeFilename(fileName)}-analytics.json`, {
    exportedAt: new Date().toISOString(),
    mappings,
    analytics,
  });
}

export function exportAiSummary(fileName: string, insight: AiInsight, locale: Locale = "en") {
  downloadText(
    `${safeFilename(fileName)}-ai-summary.txt`,
    [
      t(locale, "exports.aiSummary"),
      `${pdfText(locale, "exported")}: ${new Date().toISOString()}`,
      "",
      insight.summary,
      "",
      t(locale, "ai.trends"),
      ...insight.trends.map((trend) => `- ${trend}`),
      "",
      t(locale, "ai.focus"),
      ...insight.instructionalFocus.map((focus) => `- ${focus}`),
      "",
      t(locale, "ai.cautions"),
      ...insight.cautions.map((caution) => `- ${caution}`),
    ].join("\n"),
  );
}

export function exportExtraNormalizedDataset(fileName: string, normalized: NormalizationResult, extraAnalytics?: ExtraAnalyticsResult) {
  downloadJson(`${safeFilename(fileName)}-extra-normalized.json`, {
    exportedAt: new Date().toISOString(),
    privacy: "Browser-only Extra export created locally by the teacher.",
    workspace: "Extra",
    normalized,
    extraAnalyticsSummary: extraAnalytics
      ? {
          generatedAt: extraAnalytics.generatedAt,
          recordCount: extraAnalytics.recordCount,
          progression: extraAnalytics.progression,
          coverage: extraAnalytics.coverage,
          limitations: extraAnalytics.limitations,
        }
      : undefined,
  });
}

export function exportExtraAnalytics(fileName: string, extraAnalytics: ExtraAnalyticsResult) {
  downloadJson(`${safeFilename(fileName)}-extra-analytics.json`, {
    exportedAt: new Date().toISOString(),
    workspace: "Extra",
    privacy: "Advanced analytics computed locally in the browser.",
    extraAnalytics,
  });
}

export function exportExtraAiSummary(fileName: string, insight: AiInsight, locale: Locale = "en") {
  downloadText(
    `${safeFilename(fileName)}-extra-ai-summary.txt`,
    [
      t(locale, "exports.extraAiSummary"),
      `${pdfText(locale, "exported")}: ${new Date().toISOString()}`,
      "",
      insight.summary,
      "",
      t(locale, "ai.trends"),
      ...insight.trends.map((trend) => `- ${trend}`),
      "",
      t(locale, "ai.focus"),
      ...insight.instructionalFocus.map((focus) => `- ${focus}`),
      "",
      t(locale, "ai.cautions"),
      ...insight.cautions.map((caution) => `- ${caution}`),
    ].join("\n"),
  );
}

export async function exportPdfReport(fileName: string, analytics: AnalyticsResult, insight?: AiInsight, locale: Locale = "en") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await registerPdfFont(doc, locale);
  const report = createReportWriter(doc, fileName, locale);

  report.cover(analytics);
  report.metricGrid([
    { label: t(locale, "common.records"), value: analytics.recordCount.toLocaleString(), note: pdfText(locale, "normalizedRecords") },
    { label: t(locale, "common.average"), value: pct(analytics.overview.mean), note: pdfText(locale, "meanScore") },
    { label: t(locale, "overview.median"), value: pct(analytics.overview.median), note: pdfText(locale, "middleScore") },
    { label: t(locale, "common.mastery"), value: pct(analytics.overview.masteryRate), note: pdfText(locale, "atOrAbove80") },
    { label: t(locale, "overview.consistency"), value: pct(analytics.overview.consistencyScore), note: pdfText(locale, "stdDevFormula") },
    {
      label: t(locale, "common.trend"),
      value: localizeDirection(analytics.trend.direction, locale),
      note: `${formatSignedChange(analytics.trend.change)} ${pdfText(locale, "fromEarliestToLatest")}`,
    },
  ]);

  report.trendSummary(analytics);

  report.section(t(locale, "overview.categoryPerformance"), pdfText(locale, "categoryPerformanceSubtitle"));
  report.horizontalBars(
    analytics.chartData.topicPerformance.slice(0, 10).map((item, index) => ({
      label: localizeLabel(item.topic, locale),
      value: item.average,
      suffix: "%",
      color: chartRgb(index),
      sublabel: `${item.count} ${pdfText(locale, "recordsLower")} | ${t(locale, "common.mastery")} ${pct(item.masteryRate)}`,
    })),
    100,
  );

  report.section(t(locale, "overview.scoreDistribution"), pdfText(locale, "scoreDistributionSubtitle"));
  report.horizontalBars(
    analytics.chartData.distribution.map((item, index) => ({
      label: item.label,
      value: item.count,
      suffix: "",
      color: chartRgb(index + 2),
      sublabel: `${item.min}-${item.max}`,
    })),
    Math.max(...analytics.chartData.distribution.map((item) => item.count), 1),
  );

  report.section(t(locale, "overview.masteryBreakdown"), pdfText(locale, "masteryBreakdownSubtitle"));
  report.stackedBand(
    analytics.masteryBreakdown.map((item, index) => ({
      label: localizeLabel(item.label, locale),
      value: item.percentage,
      count: item.count,
      color: chartRgb(index),
    })),
  );

  if (analytics.chartData.trend.length > 1) {
    report.section(t(locale, "overview.trendOverTime"), pdfText(locale, "trendOverTimeSubtitle"));
    report.lineChart(
      analytics.chartData.trend.map((item) => ({
        label: item.date,
        value: item.average,
      })),
    );
  }

  report.twoColumnLists(
    pdfText(locale, "trendSignals"),
    {
      title: t(locale, "trend.improvingCategories"),
      items: analytics.trendSignals.improving.map(
        (item) => `${localizeLabel(item.label, locale)} | ${formatSignedChange(item.change)} | ${pct(item.firstAverage)} ${pdfText(locale, "to")} ${pct(item.latestAverage)}`,
      ),
    },
    {
      title: t(locale, "trend.decliningCategories"),
      items: analytics.trendSignals.declining.map(
        (item) => `${localizeLabel(item.label, locale)} | ${formatSignedChange(item.change)} | ${pct(item.firstAverage)} ${pdfText(locale, "to")} ${pct(item.latestAverage)}`,
      ),
    },
  );

  report.twoColumnLists(
    pdfText(locale, "categorySignals"),
    {
      title: pdfText(locale, "weakestCategories"),
      items: analytics.weakTopics.map((topic) => `${localizeLabel(topic.topic, locale)} | ${pct(topic.average)} | ${topic.count} ${pdfText(locale, "recordsLower")}`),
    },
    {
      title: pdfText(locale, "strongestCategories"),
      items: analytics.strongTopics.map((topic) => `${localizeLabel(topic.topic, locale)} | ${pct(topic.average)} | ${topic.count} ${pdfText(locale, "recordsLower")}`),
    },
  );

  report.aiSummary(insight);
  report.finish();
  doc.save(`${safeFilename(fileName)}-report.pdf`);
}

export async function exportExtraPdfReport(fileName: string, extraAnalytics: ExtraAnalyticsResult, insight?: AiInsight, locale: Locale = "en") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await registerPdfFont(doc, locale);
  const report = createReportWriter(doc, fileName, locale);
  const firstProgression = extraAnalytics.progression.points[0];
  const latestProgression = extraAnalytics.progression.points[extraAnalytics.progression.points.length - 1];
  const movement =
    firstProgression && latestProgression ? latestProgression.rollingAverage - firstProgression.rollingAverage : 0;

  report.coverExtra(extraAnalytics);
  report.metricGrid([
    { label: t(locale, "common.records"), value: extraAnalytics.recordCount.toLocaleString(), note: pdfText(locale, "extraNormalizedRecords") },
    { label: pdfText(locale, "coverage"), value: formatChartValue(extraAnalytics.coverage.imbalanceIndex), note: pdfText(locale, "imbalanceIndex") },
    { label: pdfText(locale, "instability"), value: formatChartValue(extraAnalytics.progression.instabilityIndex), note: pdfText(locale, "avgVolatility") },
    { label: pdfText(locale, "movement"), value: formatSignedChange(movement), note: localizeDirection(extraAnalytics.progression.direction, locale) },
    { label: pdfText(locale, "links"), value: extraAnalytics.relationships.links.length.toString(), note: pdfText(locale, "relationshipSignals") },
    { label: pdfText(locale, "flags"), value: extraAnalytics.anomalies.length.toString(), note: pdfText(locale, "patternSignals") },
  ]);

  report.section(t(locale, "extra.progression"), pdfText(locale, "progressionMomentumSubtitle"));
  if (extraAnalytics.progression.points.length > 1) {
    report.lineChart(
      extraAnalytics.progression.points.map((point) => ({
        label: point.label,
        value: point.rollingAverage,
      })),
    );
  } else {
    report.emptyState();
  }

  report.section(t(locale, "extra.coverage"), pdfText(locale, "curriculumCoverageSubtitle"));
  report.horizontalBars(
    extraAnalytics.coverage.items.slice(0, 12).map((item, index) => ({
      label: localizeLabel(item.label, locale),
      value: item.share,
      suffix: "%",
      color: item.status === "overrepresented" ? palette.orange : item.status === "underrepresented" ? palette.red : chartRgb(index),
      sublabel: `${item.count} ${pdfText(locale, "recordsLower")} | ${localizeLabel(item.status, locale)}`,
    })),
    Math.max(...extraAnalytics.coverage.items.map((item) => item.share), 1),
  );

  report.section(pdfText(locale, "relationshipStrengths"), pdfText(locale, "relationshipStrengthsSubtitle"));
  report.horizontalBars(
    extraAnalytics.relationships.links.slice(0, 10).map((link, index) => ({
      label: `${localizeLabel(link.source, locale)} <> ${localizeLabel(link.target, locale)}`,
      value: Math.abs(link.correlation) * 100,
      suffix: "%",
      color: link.correlation >= 0 ? chartRgb(index) : palette.red,
      sublabel: `${localizeLabel(link.strength, locale)} | r=${formatChartValue(link.correlation)}`,
    })),
    100,
  );

  report.twoColumnLists(
    pdfText(locale, "extraSignals"),
    {
      title: pdfText(locale, "coverageFlags"),
      items: [...extraAnalytics.coverage.overrepresented, ...extraAnalytics.coverage.underrepresented].map(
        (item) => `${localizeLabel(item.label, locale)} | ${localizeLabel(item.status, locale)} | ${formatChartValue(item.share)}%`,
      ),
    },
    {
      title: pdfText(locale, "patternSignals"),
      items: extraAnalytics.anomalies.map((item) => `${localizeLabel(item.label, locale)} | ${localizeLabel(item.type, locale)} | ${localizeLabel(item.description, locale)}`),
    },
  );

  report.section(t(locale, "extra.assessment"), pdfText(locale, "assessmentSubtitle"));
  report.horizontalBars(
    extraAnalytics.assessments.slice(0, 10).map((item, index) => ({
      label: localizeLabel(item.label, locale),
      value: item.variance,
      suffix: "",
      color: chartRgb(index + 1),
      sublabel: `${pdfText(locale, "diversity")} ${item.topicDiversity} | ${pdfText(locale, "concentration")} ${formatChartValue(item.concentration)}%`,
    })),
    Math.max(...extraAnalytics.assessments.map((item) => item.variance), 1),
  );

  report.aiSummary(insight);
  report.finish();
  doc.save(`${safeFilename(fileName)}-extra-report.pdf`);
}

export async function exportStudentCoveragePdf(fileName: string, student: StudentCoveragePdfData, locale: Locale = "en") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await registerPdfFont(doc, locale);
  const report = createReportWriter(doc, fileName, locale);

  report.coverStudent(student);
  report.metricGrid([
    { label: t(locale, "common.records"), value: student.count.toLocaleString(), note: pdfText(locale, "studentRecordGroup") },
    { label: t(locale, "common.average"), value: pct(student.average), note: pdfText(locale, "meanScore") },
    { label: t(locale, "overview.median"), value: pct(student.median), note: pdfText(locale, "middleScore") },
    { label: t(locale, "common.mastery"), value: pct(student.masteryRate), note: pdfText(locale, "atOrAbove80") },
    { label: t(locale, "overview.consistency"), value: pct(student.consistencyScore), note: pdfText(locale, "stdDevFormula") },
    { label: t(locale, "common.trend"), value: localizeDirection(student.trend.direction, locale), note: `${formatSignedChange(student.trend.change)} ${pdfText(locale, "fromEarliestToLatest")}` },
  ]);

  report.section(pdfText(locale, "studentProgression"), pdfText(locale, "studentProgressionSubtitle"));
  if (student.trend.points.length > 1) {
    report.lineChart(
      student.trend.points.map((point) => ({
        label: localizeLabel(point.label, locale),
        value: point.average,
      })),
    );
  } else {
    report.emptyState();
  }

  report.section(pdfText(locale, "studentCoverageTitle"), pdfText(locale, "studentCoverageSubtitle"));
  report.horizontalBars(
    student.coverage.slice(0, 12).map((item, index) => ({
      label: localizeLabel(item.label, locale),
      value: item.average,
      suffix: "%",
      color: chartRgb(index),
      sublabel: `${item.count} ${pdfText(locale, "recordsLower")} | ${t(locale, "common.mastery")} ${pct(item.masteryRate)}`,
    })),
    100,
  );

  if (student.subjects.length > 1) {
    report.section(pdfText(locale, "studentSubjectTitle"), pdfText(locale, "studentSubjectSubtitle"));
    report.horizontalBars(
      student.subjects.slice(0, 10).map((item, index) => ({
        label: localizeLabel(item.label, locale),
        value: item.average,
        suffix: "%",
        color: chartRgb(index + 1),
        sublabel: `${item.count} ${pdfText(locale, "recordsLower")} | ${t(locale, "common.mastery")} ${pct(item.masteryRate)}`,
      })),
      100,
    );
  }

  report.section(t(locale, "individual.distribution"), pdfText(locale, "studentDistributionSubtitle"));
  report.horizontalBars(
    student.distribution.map((item, index) => ({
      label: item.label,
      value: item.count,
      suffix: "",
      color: chartRgb(index + 2),
      sublabel: pdfText(locale, "recordsLower"),
    })),
    Math.max(...student.distribution.map((item) => item.count), 1),
  );

  report.twoColumnLists(
    pdfText(locale, "deterministicCoverage"),
    {
      title: t(locale, "individual.strongest"),
      items: student.strongest.map((item) => formatStudentGroup(item, locale)),
    },
    {
      title: t(locale, "individual.watch"),
      items: student.weakest.map((item) => formatStudentGroup(item, locale)),
    },
  );

  report.section(t(locale, "individual.recentRecords"), pdfText(locale, "studentRecentSubtitle"));
  report.recordTable(
    [
      t(locale, "individual.date"),
      t(locale, "individual.category"),
      t(locale, "individual.assessment"),
      t(locale, "individual.score"),
    ],
    student.records.slice(-14).reverse().map((record) => [
      record.date ?? "-",
      localizeLabel(recordDimension(record), locale),
      localizeLabel(record.assessment ?? record.metricName ?? record.subject ?? "-", locale),
      pct(scoreToPercent(record.score, record.maxScore)),
    ]),
  );

  report.finish();
  doc.save(`${safeFilename(fileName)}-${safeFilename(student.label, "student")}-individual-report.pdf`);
}

type Rgb = [number, number, number];
type ReportMetric = { label: string; value: string; note: string };
type ReportBar = { label: string; value: number; suffix: string; color: Rgb; sublabel?: string };

const page = {
  width: 612,
  height: 792,
  margin: 42,
  bottom: 54,
};

const palette = {
  ink: [28, 31, 35] as Rgb,
  muted: [79, 89, 84] as Rgb,
  faint: [247, 250, 247] as Rgb,
  line: [217, 222, 216] as Rgb,
  accent: [22, 114, 109] as Rgb,
  accentDark: [15, 90, 85] as Rgb,
  blue: [47, 105, 161] as Rgb,
  orange: [198, 93, 33] as Rgb,
  gold: [184, 134, 11] as Rgb,
  purple: [122, 90, 166] as Rgb,
  red: [182, 63, 63] as Rgb,
  white: [255, 255, 255] as Rgb,
};

type PdfTextKey = keyof typeof pdfCopy.en;

const pdfCopy = {
  en: {
    exported: "Exported",
    classroomReportTitle: "Classroom Analytics Report",
    extraReportTitle: "Extra Classroom Intelligence Report",
    generatedLocally: "Generated locally",
    normalizedRecords: "Normalized records",
    extraNormalizedRecords: "Extra normalized records",
    meanScore: "Mean score",
    middleScore: "Middle score",
    atOrAbove80: "At or above 80%",
    stdDevFormula: "100 - standard deviation",
    fromEarliestToLatest: "from earliest to latest",
    recordsLower: "records",
    categoryPerformanceSubtitle: "Top classroom categories by deterministic average score.",
    scoreDistributionSubtitle: "Records are bucketed on a 0-100 scale. Distribution charts clamp visual bins at 100.",
    masteryBreakdownSubtitle: "Anonymous aggregate bands used for dashboard grouping.",
    trendOverTimeSubtitle: "Classroom averages grouped by mapped date or ordered assessment labels.",
    trendSignals: "Trend Signals",
    categorySignals: "Category Signals",
    weakestCategories: "Weakest Categories",
    strongestCategories: "Strongest Categories",
    privacyFirstExport: "Privacy-first export",
    privacyOverviewMsg: "All deterministic analytics were computed in the browser. AI text, when present, used aggregate findings only.",
    privacyExtraMsg: "Advanced aggregate analytics computed in the browser. AI text, when present, used Extra findings only.",
    recordsIncluded: "normalized records included in this report.",
    trendMomentum: "Trend Momentum",
    trendMomentumSubtitle: "Early-to-latest movement is emphasized before present-only performance.",
    overallMovement: "Overall movement",
    noSignal: "No signal",
    in: "in",
    to: "to",
    needTrendSegments: "At least two dated or ordered segments are needed for a movement signal.",
    direction: "Direction",
    slope: "Slope",
    movementMagnitude: "Movement magnitude",
    categoryListsSubtitle: "Category lists are sorted from deterministic local averages.",
    aiSummarySubtitle: "Aggregate-only explanation. No individual student analysis is included.",
    browserOnly: "Browser-only classroom analytics",
    page: "Page",
    of: "of",
    coverage: "Coverage",
    instability: "Instability",
    movement: "Movement",
    links: "Links",
    flags: "Flags",
    imbalanceIndex: "Imbalance index",
    avgVolatility: "Avg volatility",
    relationshipSignals: "Relationship signals",
    patternSignals: "Pattern Signals",
    progressionMomentumSubtitle: "Rolling classroom movement across dated, ordered, or upload-order segments.",
    curriculumCoverageSubtitle: "How much of the uploaded dataset is represented by each dimension.",
    relationshipStrengths: "Relationship Strengths",
    relationshipStrengthsSubtitle: "Statistical relationships only. These do not imply causation.",
    extraSignals: "Extra Signals",
    coverageFlags: "Coverage Flags",
    assessmentSubtitle: "Assessment-level spread, concentration, and dimension diversity.",
    diversity: "diversity",
    concentration: "concentration",
    studentReportTitle: "Student-Level Coverage Report",
    studentRecordGroup: "Student record group",
    individualPrivacyMsg: "This report is generated locally for teacher review. It contains deterministic student-level coverage only and no AI judgment.",
    studentProgression: "Student Progression",
    studentProgressionSubtitle: "Movement is calculated from dated records, ordered assessments, or record sequence when dates are unavailable.",
    studentCoverageTitle: "Student-Level Deterministic Coverage",
    studentCoverageSubtitle: "Coverage areas are computed from normalized categories, topics, skills, standards, or other mapped dimensions.",
    studentSubjectTitle: "Subject / Term Coverage",
    studentSubjectSubtitle: "Subject and term groupings are shown only when multiple groups exist.",
    studentDistributionSubtitle: "Score records are clamped into 0-100 distribution bins for readable reporting.",
    deterministicCoverage: "Deterministic Coverage Signals",
    studentRecentSubtitle: "Recent normalized records used in this student-level report.",
  },
  mn: {
    exported: "Экспортолсон",
    classroomReportTitle: "Ангийн аналитикийн тайлан",
    extraReportTitle: "Extra ангийн гүн аналитикийн тайлан",
    generatedLocally: "Дотооддоо үүсгэсэн",
    normalizedRecords: "Нэгтгэсэн рекорд",
    extraNormalizedRecords: "Extra нэгтгэсэн рекорд",
    meanScore: "Дундаж оноо",
    middleScore: "Голын оноо",
    atOrAbove80: "80%-аас дээш",
    stdDevFormula: "100 - стандарт хазайлт",
    fromEarliestToLatest: "эхнээс сүүл хүртэл",
    recordsLower: "рекорд",
    categoryPerformanceSubtitle: "Детерминистик дундаж оноогоор эрэмбэлсэн ангийн гол ангиллууд.",
    scoreDistributionSubtitle: "Рекордуудыг 0-100 хэмжүүрээр бүлэглэнэ. Дүрслэлийн дээд хязгаар 100 байна.",
    masteryBreakdownSubtitle: "Самбарын бүлэглэлд ашигласан нэргүй нэгтгэсэн түвшний зурвасууд.",
    trendOverTimeSubtitle: "Огноо эсвэл дараалсан үнэлгээний шошгоор бүлэглэсэн ангийн дундаж.",
    trendSignals: "Чиг хандлагын дохио",
    categorySignals: "Ангиллын дохио",
    weakestCategories: "Анхаарах ангиллууд",
    strongestCategories: "Хүчтэй ангиллууд",
    privacyFirstExport: "Нууцлал хамгаалсан экспорт",
    privacyOverviewMsg: "Бүх детерминистик аналитик браузер дотор тооцоологдсон. AI текст байвал зөвхөн нэгтгэсэн үр дүнг ашигласан.",
    privacyExtraMsg: "Дэвшилтэт нэгтгэсэн аналитик браузер дотор тооцоологдсон. AI текст байвал зөвхөн Extra үр дүнг ашигласан.",
    recordsIncluded: "нэгтгэсэн рекорд энэ тайланд орсон.",
    trendMomentum: "Чиг хандлагын хөдөлгөөн",
    trendMomentumSubtitle: "Зөвхөн одоогийн түвшин биш, эхнээс сүүл хүртэлх хөдөлгөөнийг онцолно.",
    overallMovement: "Ерөнхий хөдөлгөөн",
    noSignal: "Дохио алга",
    in: "үед",
    to: "→",
    needTrendSegments: "Хөдөлгөөний дохио гаргахад дор хаяж хоёр огноотой эсвэл дараалсан хэсэг хэрэгтэй.",
    direction: "Чиглэл",
    slope: "Налуу",
    movementMagnitude: "Хөдөлгөөний хэмжээ",
    categoryListsSubtitle: "Ангиллын жагсаалт нь дотоод детерминистик дундажаар эрэмбэлэгдэнэ.",
    aiSummarySubtitle: "Зөвхөн нэгтгэсэн тайлбар. Хувь сурагчийн шинжилгээ ороогүй.",
    browserOnly: "Браузер доторх ангийн аналитик",
    page: "Хуудас",
    of: "/",
    coverage: "Хамралт",
    instability: "Тогтворгүй байдал",
    movement: "Хөдөлгөөн",
    links: "Холбоос",
    flags: "Дохио",
    imbalanceIndex: "Тэнцвэргүй индекс",
    avgVolatility: "Дундаж хэлбэлзэл",
    relationshipSignals: "Хамаарлын дохио",
    patternSignals: "Загварын дохио",
    progressionMomentumSubtitle: "Огноо, дараалсан шошго эсвэл upload-order хэсгээр rolling хөдөлгөөнийг харуулна.",
    curriculumCoverageSubtitle: "Оруулсан өгөгдөлд хэмжээс бүр хэдий хэмжээгээр төлөөлөгдсөнийг харуулна.",
    relationshipStrengths: "Хамаарлын хүч",
    relationshipStrengthsSubtitle: "Зөвхөн статистик хамаарал. Шалтгаан гэж дүгнэхгүй.",
    extraSignals: "Extra дохио",
    coverageFlags: "Хамралтын дохио",
    assessmentSubtitle: "Үнэлгээний түвшний тархалт, төвлөрөл, хэмжээсийн олон янз байдал.",
    diversity: "олон янз",
    concentration: "төвлөрөл",
    studentReportTitle: "Сурагчийн хамралтын тайлан",
    studentRecordGroup: "Сурагчийн рекордын бүлэг",
    individualPrivacyMsg: "Энэ тайлан багшийн браузер дотор үүснэ. Зөвхөн детерминист сурагчийн хамралтыг харуулна, AI дүгнэлт ороогүй.",
    studentProgression: "Сурагчийн ахиц",
    studentProgressionSubtitle: "Хөдөлгөөн нь огноотой рекорд, дараалсан үнэлгээ эсвэл огноо байхгүй үед рекордын дарааллаас тооцогдоно.",
    studentCoverageTitle: "Сурагчийн детерминист хамралт",
    studentCoverageSubtitle: "Хамралтын хэсгүүд нь нэгтгэсэн ангилал, сэдэв, чадвар, стандарт эсвэл бусад mapped хэмжээсээс тооцогдоно.",
    studentSubjectTitle: "Хичээл / улирлын хамралт",
    studentSubjectSubtitle: "Олон бүлэг байгаа үед хичээл болон улирлын бүлэглэлийг харуулна.",
    studentDistributionSubtitle: "Онооны рекордуудыг ойлгомжтой тайлангийн тулд 0-100 тархалтын бүлгүүдэд хязгаарлана.",
    deterministicCoverage: "Детерминист хамралтын дохио",
    studentRecentSubtitle: "Энэ сурагчийн тайланд ашигласан сүүлийн нэгтгэсэн рекордууд.",
  },
} as const;

let notoSansBase64Promise: Promise<string> | undefined;

async function registerPdfFont(doc: jsPDF, locale: Locale) {
  if (locale !== "mn") {
    return;
  }

  try {
    const base64 = await loadNotoSansBase64();
    doc.addFileToVFS("NotoSans-Regular.ttf", base64);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "bold");
  } catch {
    // If the font asset is unavailable, jsPDF will fall back to its built-in font.
  }
}

function loadNotoSansBase64() {
  notoSansBase64Promise ??= fetch("/fonts/NotoSans-Regular.ttf")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Font asset unavailable.");
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      return btoa(binary);
    });

  return notoSansBase64Promise;
}

function pdfText(locale: Locale, key: PdfTextKey) {
  return locale === "mn" ? pdfCopy.mn[key] : pdfCopy.en[key];
}

function createReportWriter(doc: jsPDF, fileName: string, locale: Locale) {
  let y = page.margin;
  const fontName = locale === "mn" ? "NotoSans" : "helvetica";

  const setFill = (color: Rgb) => doc.setFillColor(color[0], color[1], color[2]);
  const setStroke = (color: Rgb) => doc.setDrawColor(color[0], color[1], color[2]);
  const setText = (color: Rgb) => doc.setTextColor(color[0], color[1], color[2]);
  const setFont = (style: "normal" | "bold" = "normal") => doc.setFont(fontName, style);

  function addPageIfNeeded(height = 100) {
    if (y + height <= page.height - page.bottom) {
      return;
    }

    doc.addPage();
    y = page.margin;
  }

  function writeWrapped(text: string, x: number, width: number, fontSize = 10, lineHeight = 14, color = palette.muted) {
    setFont("normal");
    doc.setFontSize(fontSize);
    setText(color);
    const lines = doc.splitTextToSize(text, width) as string[];
    lines.forEach((line) => {
      addPageIfNeeded(lineHeight + 4);
      doc.text(line, x, y);
      y += lineHeight;
    });
  }

  function section(title: string, subtitle?: string, keepWithNext = 430) {
    addPageIfNeeded(keepWithNext);
    y += y === page.margin ? 0 : 8;
    setFill(palette.accent);
    doc.rect(page.margin, y - 2, 4, 21, "F");
    setFont("bold");
    doc.setFontSize(14);
    setText(palette.ink);
    doc.text(title, page.margin + 12, y + 12);
    y += 24;
    if (subtitle) {
      writeWrapped(subtitle, page.margin + 12, page.width - page.margin * 2 - 12, 9, 12);
      y += 6;
    }
  }

  function cover(analytics: AnalyticsResult) {
    setFill(palette.accentDark);
    doc.rect(0, 0, page.width, 118, "F");
    setFill([20, 143, 134]);
    doc.rect(0, 114, page.width, 4, "F");

    setFont("bold");
    doc.setFontSize(24);
    setText(palette.white);
    doc.text(pdfText(locale, "classroomReportTitle"), page.margin, 54);

    setFont("normal");
    doc.setFontSize(10);
    doc.text(trimMiddle(fileName, 78), page.margin, 76);
    doc.text(`${pdfText(locale, "generatedLocally")} ${new Date().toLocaleString(locale === "mn" ? "mn-MN" : undefined)}`, page.margin, 92);

    y = 150;
    drawPrivacyBanner(analytics.recordCount);
  }

  function coverExtra(extraAnalytics: ExtraAnalyticsResult) {
    setFill([16, 20, 24]);
    doc.rect(0, 0, page.width, 118, "F");
    setFill([111, 91, 214]);
    doc.rect(0, 114, page.width, 4, "F");

    setFont("bold");
    doc.setFontSize(24);
    setText(palette.white);
    doc.text(pdfText(locale, "extraReportTitle"), page.margin, 54);

    setFont("normal");
    doc.setFontSize(10);
    doc.text(trimMiddle(fileName, 78), page.margin, 76);
    doc.text(`${pdfText(locale, "generatedLocally")} ${new Date().toLocaleString(locale === "mn" ? "mn-MN" : undefined)}`, page.margin, 92);

    y = 150;
    drawPrivacyBanner(extraAnalytics.recordCount, pdfText(locale, "privacyExtraMsg"));
  }

  function coverStudent(student: StudentCoveragePdfData) {
    setFill(palette.accentDark);
    doc.rect(0, 0, page.width, 130, "F");
    setFill(palette.gold);
    doc.rect(0, 126, page.width, 4, "F");

    setFont("bold");
    doc.setFontSize(22);
    setText(palette.white);
    doc.text(pdfText(locale, "studentReportTitle"), page.margin, 46);

    doc.setFontSize(16);
    doc.text(trimMiddle(student.label, 58), page.margin, 73);

    setFont("normal");
    doc.setFontSize(9.5);
    doc.text(trimMiddle(student.secondaryLabel || fileName, 78), page.margin, 92);
    doc.text(`${pdfText(locale, "generatedLocally")} ${new Date().toLocaleString(locale === "mn" ? "mn-MN" : undefined)}`, page.margin, 108);

    setFill([239, 248, 245]);
    doc.roundedRect(page.width - page.margin - 128, 37, 128, 58, 6, 6, "F");
    setFont("bold");
    doc.setFontSize(8);
    setText(palette.accentDark);
    doc.text(t(locale, "common.trend").toUpperCase(), page.width - page.margin - 112, 56);
    doc.setFontSize(14);
    setText(trendRgb(student.trend.direction));
    doc.text(localizeDirection(student.trend.direction, locale), page.width - page.margin - 112, 77);
    setFont("normal");
    doc.setFontSize(8);
    setText(palette.muted);
    doc.text(formatSignedChange(student.trend.change), page.width - page.margin - 112, 90);

    y = 158;
    drawPrivacyBanner(student.count, pdfText(locale, "individualPrivacyMsg"));
  }

  function drawPrivacyBanner(
    recordCount: number,
    message = pdfText(locale, "privacyOverviewMsg"),
  ) {
    setFill([239, 248, 245]);
    setStroke([188, 200, 192]);
    doc.rect(page.margin, y, page.width - page.margin * 2, 58, "FD");
    setFont("bold");
    doc.setFontSize(10);
    setText(palette.accentDark);
    doc.text(pdfText(locale, "privacyFirstExport"), page.margin + 14, y + 21);
    setFont("normal");
    doc.setFontSize(9);
    setText(palette.muted);
    doc.text(message, page.margin + 14, y + 38);
    doc.text(`${recordCount.toLocaleString()} ${pdfText(locale, "recordsIncluded")}`, page.width - page.margin - 188, y + 21);
    y += 78;
  }

  function metricGrid(metrics: ReportMetric[]) {
    addPageIfNeeded(158);
    const gap = 12;
    const columns = 3;
    const cardWidth = (page.width - page.margin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = 70;

    metrics.forEach((metric, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = page.margin + column * (cardWidth + gap);
      const cardY = y + row * (cardHeight + gap);

      setFill(palette.faint);
      setStroke(palette.line);
      doc.rect(x, cardY, cardWidth, cardHeight, "FD");
      setFont("bold");
      doc.setFontSize(8);
      setText(palette.muted);
      doc.text(metric.label.toUpperCase(), x + 12, cardY + 18);
      doc.setFontSize(19);
      setText(palette.ink);
      doc.text(metric.value, x + 12, cardY + 42);
      setFont("normal");
      doc.setFontSize(8);
      setText(palette.muted);
      doc.text(trimLabel(metric.note, 24), x + 12, cardY + 58);
    });

    y += cardHeight * 2 + gap + 24;
  }

  function horizontalBars(data: ReportBar[], maxValue: number) {
    if (!data.length) {
      emptyState();
      return;
    }

    const rowHeight = 29;
    const height = data.length * rowHeight + 26;
    addPageIfNeeded(height);
    const labelWidth = 142;
    const chartWidth = page.width - page.margin * 2 - labelWidth - 64;
    const startY = y;

    setFill(palette.faint);
    setStroke(palette.line);
    doc.rect(page.margin, y, page.width - page.margin * 2, height, "FD");
    y += 18;

    data.forEach((item, index) => {
      const rowY = y + index * rowHeight;
      const barX = page.margin + labelWidth;
      const barY = rowY - 9;
      const barWidth = Math.max(2, (item.value / Math.max(maxValue, 1)) * chartWidth);

      setFont("bold");
      doc.setFontSize(8.5);
      setText(palette.ink);
      doc.text(trimLabel(item.label, 24), page.margin + 12, rowY);
      if (item.sublabel) {
        setFont("normal");
        doc.setFontSize(7.5);
        setText(palette.muted);
        doc.text(trimLabel(item.sublabel, 30), page.margin + 12, rowY + 10);
      }

      setFill([230, 235, 229]);
      doc.rect(barX, barY, chartWidth, 10, "F");
      setFill(item.color);
      doc.rect(barX, barY, barWidth, 10, "F");

      setFont("bold");
      doc.setFontSize(8.5);
      setText(palette.ink);
      doc.text(`${formatChartValue(item.value)}${item.suffix}`, barX + chartWidth + 12, rowY);
    });

    y = startY + height + 14;
  }

  function trendSummary(analytics: AnalyticsResult) {
    const signal = analytics.trendSignals.overall;
    const hasTrend = signal.direction !== "insufficient_data";

    section(pdfText(locale, "trendMomentum"), pdfText(locale, "trendMomentumSubtitle"));
    addPageIfNeeded(130);
    const width = page.width - page.margin * 2;
    const cardY = y;

    setFill([248, 250, 247]);
    setStroke(palette.line);
    doc.rect(page.margin, cardY, width, 112, "FD");
    setFont("bold");
    doc.setFontSize(9);
    setText(palette.muted);
    doc.text(pdfText(locale, "overallMovement").toUpperCase(), page.margin + 14, cardY + 22);

    doc.setFontSize(24);
    setText(hasTrend ? trendRgb(signal.direction) : palette.muted);
    doc.text(hasTrend ? formatSignedChange(signal.change) : pdfText(locale, "noSignal"), page.margin + 14, cardY + 52);

    setFont("normal");
    doc.setFontSize(9);
    setText(palette.ink);
    const detail = hasTrend
      ? `${pct(signal.firstAverage)} ${pdfText(locale, "in")} ${localizeLabel(signal.firstLabel, locale)} ${pdfText(locale, "to")} ${pct(signal.latestAverage)} ${pdfText(locale, "in")} ${localizeLabel(signal.latestLabel, locale)}.`
      : pdfText(locale, "needTrendSegments");
    doc.text(detail, page.margin + 14, cardY + 74);
    doc.text(`${pdfText(locale, "direction")}: ${localizeDirection(signal.direction, locale)} | ${pdfText(locale, "slope")}: ${analytics.trend.slope}`, page.margin + 14, cardY + 91);

    const barX = page.margin + 350;
    const barY = cardY + 35;
    setFill([230, 235, 229]);
    doc.rect(barX, barY, 128, 10, "F");
    setFill(hasTrend ? trendRgb(signal.direction) : palette.muted);
    doc.rect(barX, barY, hasTrend ? Math.max(12, Math.min(128, Math.abs(signal.change) * 7 + 20)) : 12, 10, "F");
    setFont("normal");
    doc.setFontSize(8);
    setText(palette.muted);
    doc.text(pdfText(locale, "movementMagnitude"), barX, barY + 25);

    y += 130;
  }

  function stackedBand(data: { label: string; value: number; count: number; color: Rgb }[]) {
    if (!data.length) {
      emptyState();
      return;
    }

    addPageIfNeeded(124);
    const width = page.width - page.margin * 2;
    const barY = y + 14;
    let x = page.margin;

    setFill(palette.faint);
    setStroke(palette.line);
    doc.rect(page.margin, y, width, 104, "FD");
    data.forEach((item) => {
      const segmentWidth = (item.value / 100) * (width - 24);
      if (segmentWidth <= 0) {
        return;
      }
      setFill(item.color);
      doc.rect(x + 12, barY, segmentWidth, 18, "F");
      x += segmentWidth;
    });

    y += 54;
    data.forEach((item, index) => {
      const legendX = page.margin + 14 + (index % 2) * 250;
      const legendY = y + Math.floor(index / 2) * 20;
      setFill(item.color);
      doc.rect(legendX, legendY - 8, 8, 8, "F");
      setFont("normal");
      doc.setFontSize(9);
      setText(palette.ink);
      doc.text(`${item.label}: ${pct(item.value)} (${item.count})`, legendX + 14, legendY);
    });
    y += 62;
  }

  function lineChart(data: { label: string; value: number }[]) {
    if (data.length < 2) {
      emptyState();
      return;
    }

    addPageIfNeeded(190);
    const width = page.width - page.margin * 2;
    const height = 150;
    const chartX = page.margin + 34;
    const chartY = y + 10;
    const chartWidth = width - 58;
    const chartHeight = 108;
    const baseline = chartY + chartHeight;
    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

    setFill(palette.faint);
    setStroke(palette.line);
    doc.rect(page.margin, y, width, height, "FD");

    [0, 25, 50, 75, 100].forEach((tick) => {
      const tickY = baseline - (tick / 100) * chartHeight;
      setStroke([222, 228, 222]);
      doc.line(chartX, tickY, chartX + chartWidth, tickY);
      setFont("normal");
      doc.setFontSize(7.5);
      setText(palette.muted);
      doc.text(`${tick}%`, page.margin + 10, tickY + 3);
    });

    const points = data.map((item, index) => ({
      x: chartX + index * step,
      y: baseline - (Math.max(0, Math.min(100, item.value)) / 100) * chartHeight,
    }));

    setStroke(palette.blue);
    doc.setLineWidth(2);
    points.forEach((point, index) => {
      if (index > 0) {
        const previous = points[index - 1];
        doc.line(previous.x, previous.y, point.x, point.y);
      }
      setFill(palette.blue);
      doc.circle(point.x, point.y, 3, "F");
    });
    doc.setLineWidth(0.2);

    setFont("normal");
    doc.setFontSize(7.5);
    setText(palette.muted);
    data.forEach((item, index) => {
      if (index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 4) === 0) {
        doc.text(trimLabel(item.label, 12), chartX + index * step - 12, baseline + 18);
      }
    });

    y += height + 16;
  }

  function twoColumnLists(title: string, left: { title: string; items: string[] }, right: { title: string; items: string[] }) {
    section(title, pdfText(locale, "categoryListsSubtitle"));
    addPageIfNeeded(160);
    const gap = 14;
    const width = (page.width - page.margin * 2 - gap) / 2;
    const startY = y;
    drawListCard(page.margin, startY, width, left);
    drawListCard(page.margin + width + gap, startY, width, right);
    y = startY + 154;
  }

  function drawListCard(x: number, cardY: number, width: number, list: { title: string; items: string[] }) {
    setFill(palette.faint);
    setStroke(palette.line);
    doc.rect(x, cardY, width, 138, "FD");
    setFont("bold");
    doc.setFontSize(10);
    setText(palette.ink);
    doc.text(list.title, x + 12, cardY + 20);
    setFont("normal");
    doc.setFontSize(8.5);
    setText(palette.muted);
    (list.items.length ? list.items : [t(locale, "common.nothing")]).slice(0, 5).forEach((item, index) => {
      doc.text(trimLabel(item, 40), x + 12, cardY + 42 + index * 17);
    });
  }

  function recordTable(headers: string[], rows: string[][]) {
    if (!rows.length) {
      emptyState();
      return;
    }

    const widths = [70, 170, 174, 70];
    const rowHeight = 26;
    const headerHeight = 28;
    const tableWidth = page.width - page.margin * 2;

    function drawHeader() {
      addPageIfNeeded(headerHeight + rowHeight);
      setFill(palette.accentDark);
      doc.rect(page.margin, y, tableWidth, headerHeight, "F");
      setFont("bold");
      doc.setFontSize(7.5);
      setText(palette.white);
      let x = page.margin + 10;
      headers.forEach((header, index) => {
        doc.text(trimLabel(header.toUpperCase(), index === 2 ? 22 : 14), x, y + 18);
        x += widths[index] ?? 90;
      });
      y += headerHeight;
    }

    drawHeader();
    rows.slice(0, 14).forEach((row, rowIndex) => {
      if (y + rowHeight > page.height - page.bottom) {
        doc.addPage();
        y = page.margin;
        drawHeader();
      }

      setFill(rowIndex % 2 ? palette.white : palette.faint);
      setStroke(palette.line);
      doc.rect(page.margin, y, tableWidth, rowHeight, "FD");
      setFont(rowIndex === 0 ? "bold" : "normal");
      doc.setFontSize(8);
      setText(palette.ink);
      let x = page.margin + 10;
      row.forEach((cell, index) => {
        doc.text(trimLabel(cell || "-", index === 1 || index === 2 ? 28 : 12), x, y + 16);
        x += widths[index] ?? 90;
      });
      y += rowHeight;
    });

    y += 14;
  }

  function aiSummary(insight?: AiInsight) {
    section(t(locale, "exports.aiSummary"), pdfText(locale, "aiSummarySubtitle"));
    addPageIfNeeded(190);
    const width = page.width - page.margin * 2;
    setFill([248, 250, 247]);
    setStroke(palette.line);
    doc.rect(page.margin, y, width, 80, "FD");
    y += 22;

    if (insight?.summary) {
      writeWrapped(insight.summary, page.margin + 14, width - 28, 9.5, 13, palette.ink);
      y += 12;
      insightList(t(locale, "ai.trends"), insight.trends);
      insightList(t(locale, "ai.focus"), insight.instructionalFocus);
      insightList(t(locale, "ai.cautions"), insight.cautions);
    } else {
      writeWrapped(
        t(locale, "ai.unavailable"),
        page.margin + 14,
        width - 28,
        9.5,
        13,
        palette.ink,
      );
      y += 14;
    }
  }

  function insightList(title: string, items: unknown[]) {
    if (!items.length) {
      return;
    }

    addPageIfNeeded(38);
    setFont("bold");
    doc.setFontSize(10);
    setText(palette.accentDark);
    doc.text(title, page.margin, y);
    y += 15;

    items.slice(0, 5).forEach((item) => {
      writeWrapped(`- ${toExportText(item)}`, page.margin + 10, page.width - page.margin * 2 - 10, 9, 12);
    });
    y += 6;
  }

  function emptyState() {
    addPageIfNeeded(64);
    setFill(palette.faint);
    setStroke(palette.line);
    doc.rect(page.margin, y, page.width - page.margin * 2, 52, "FD");
    setFont("bold");
    doc.setFontSize(10);
    setText(palette.muted);
    doc.text(t(locale, "common.nothing"), page.margin + 14, y + 31);
    y += 68;
  }

  function finish() {
    const pageCount = doc.getNumberOfPages();
    for (let index = 1; index <= pageCount; index += 1) {
      doc.setPage(index);
      setStroke(palette.line);
      doc.line(page.margin, page.height - 34, page.width - page.margin, page.height - 34);
      setFont("normal");
      doc.setFontSize(8);
      setText(palette.muted);
      doc.text(pdfText(locale, "browserOnly"), page.margin, page.height - 18);
      doc.text(`${pdfText(locale, "page")} ${index} ${pdfText(locale, "of")} ${pageCount}`, page.width - page.margin - 56, page.height - 18);
    }
  }

  return {
    cover,
    coverExtra,
    coverStudent,
    metricGrid,
    section,
    horizontalBars,
    trendSummary,
    stackedBand,
    lineChart,
    twoColumnLists,
    recordTable,
    aiSummary,
    emptyState,
    finish,
  };
}

function formatStudentGroup(item: StudentCoverageGroup, locale: Locale) {
  return `${localizeLabel(item.label, locale)} | ${pct(item.average)} | ${t(locale, "common.mastery")} ${pct(item.masteryRate)} | ${item.count} ${pdfText(locale, "recordsLower")}`;
}

function recordDimension(record: NormalizedRecord) {
  return record.topic || record.metricName || record.assessment || firstDimension(record) || record.subject || "Unspecified";
}

function firstDimension(record: NormalizedRecord) {
  return Object.values(record.dimensions ?? {}).find((value) => value.trim()) ?? "";
}

function toExportText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toExportText).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${toExportText(entry)}`)
      .join("; ");
  }

  return String(value);
}

function trimLabel(label: string, length: number) {
  return label.length > length ? `${label.slice(0, length - 1)}.` : label;
}

function trimMiddle(label: string, length: number) {
  if (label.length <= length) {
    return label;
  }

  const side = Math.floor((length - 3) / 2);
  return `${label.slice(0, side)}...${label.slice(-side)}`;
}

function pct(value: number) {
  return `${formatChartValue(value)}%`;
}

function formatSignedChange(value: number) {
  return `${value > 0 ? "+" : ""}${formatChartValue(value)} pts`;
}

function trendRgb(direction: TrendDirection): Rgb {
  if (direction === "improving") {
    return palette.accent;
  }

  if (direction === "declining") {
    return palette.red;
  }

  if (direction === "flat") {
    return palette.gold;
  }

  return palette.muted;
}

function formatChartValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function chartRgb(index: number): Rgb {
  const colors: Rgb[] = [palette.accent, palette.blue, palette.orange, palette.gold, palette.purple, palette.red];
  return colors[index % colors.length];
}
