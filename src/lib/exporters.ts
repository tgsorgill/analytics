"use client";

import { jsPDF } from "jspdf";
import { t, type Locale } from "@/lib/i18n";
import type { AiInsight, AnalyticsResult, ColumnMapping, ExtraAnalyticsResult, NormalizationResult } from "@/lib/types";
import { downloadJson, downloadText, safeFilename } from "@/lib/utils";

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
      `Exported: ${new Date().toISOString()}`,
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
      `Exported: ${new Date().toISOString()}`,
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

export function exportPdfReport(fileName: string, analytics: AnalyticsResult, insight?: AiInsight) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const report = createReportWriter(doc, fileName);

  report.cover(analytics);
  report.metricGrid([
    { label: "Records", value: analytics.recordCount.toLocaleString(), note: "Normalized records" },
    { label: "Average", value: pct(analytics.overview.mean), note: "Mean score" },
    { label: "Median", value: pct(analytics.overview.median), note: "Middle score" },
    { label: "Mastery", value: pct(analytics.overview.masteryRate), note: "At or above 80%" },
    { label: "Consistency", value: pct(analytics.overview.consistencyScore), note: "100 - standard deviation" },
    {
      label: "Trend",
      value: analytics.trend.direction.replace("_", " "),
      note: `${formatSignedChange(analytics.trend.change)} from earliest to latest`,
    },
  ]);

  report.trendSummary(analytics);

  report.section("Category Performance", "Top classroom categories by deterministic average score.");
  report.horizontalBars(
    analytics.chartData.topicPerformance.slice(0, 10).map((item, index) => ({
      label: item.topic,
      value: item.average,
      suffix: "%",
      color: chartRgb(index),
      sublabel: `${item.count} records | mastery ${pct(item.masteryRate)}`,
    })),
    100,
  );

  report.section("Score Distribution", "Records are bucketed on a 0-100 scale. Distribution charts clamp visual bins at 100.");
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

  report.section("Mastery Breakdown", "Anonymous aggregate bands used for dashboard grouping.");
  report.stackedBand(
    analytics.masteryBreakdown.map((item, index) => ({
      label: item.label,
      value: item.percentage,
      count: item.count,
      color: chartRgb(index),
    })),
  );

  if (analytics.chartData.trend.length > 1) {
    report.section("Trend Over Time", "Classroom averages grouped by mapped date fields.");
    report.lineChart(
      analytics.chartData.trend.map((item) => ({
        label: item.date,
        value: item.average,
      })),
    );
  }

  report.twoColumnLists(
    "Trend Signals",
    {
      title: "Improving Categories",
      items: analytics.trendSignals.improving.map(
        (item) => `${item.label} | ${formatSignedChange(item.change)} | ${pct(item.firstAverage)} to ${pct(item.latestAverage)}`,
      ),
    },
    {
      title: "Declining Categories",
      items: analytics.trendSignals.declining.map(
        (item) => `${item.label} | ${formatSignedChange(item.change)} | ${pct(item.firstAverage)} to ${pct(item.latestAverage)}`,
      ),
    },
  );

  report.twoColumnLists(
    "Category Signals",
    {
      title: "Weakest Categories",
      items: analytics.weakTopics.map((topic) => `${topic.topic} | ${pct(topic.average)} | ${topic.count} records`),
    },
    {
      title: "Strongest Categories",
      items: analytics.strongTopics.map((topic) => `${topic.topic} | ${pct(topic.average)} | ${topic.count} records`),
    },
  );

  report.aiSummary(insight);
  report.finish();
  doc.save(`${safeFilename(fileName)}-report.pdf`);
}

export function exportExtraPdfReport(fileName: string, extraAnalytics: ExtraAnalyticsResult, insight?: AiInsight) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const report = createReportWriter(doc, fileName);
  const firstProgression = extraAnalytics.progression.points[0];
  const latestProgression = extraAnalytics.progression.points[extraAnalytics.progression.points.length - 1];
  const movement =
    firstProgression && latestProgression ? latestProgression.rollingAverage - firstProgression.rollingAverage : 0;

  report.coverExtra(extraAnalytics);
  report.metricGrid([
    { label: "Records", value: extraAnalytics.recordCount.toLocaleString(), note: "Extra normalized records" },
    { label: "Coverage", value: formatChartValue(extraAnalytics.coverage.imbalanceIndex), note: "Imbalance index" },
    { label: "Instability", value: formatChartValue(extraAnalytics.progression.instabilityIndex), note: "Avg volatility" },
    { label: "Movement", value: formatSignedChange(movement), note: extraAnalytics.progression.direction.replace("_", " ") },
    { label: "Links", value: extraAnalytics.relationships.links.length.toString(), note: "Relationship signals" },
    { label: "Flags", value: extraAnalytics.anomalies.length.toString(), note: "Pattern signals" },
  ]);

  report.section("Progression Momentum", "Rolling classroom movement across dated or upload-order segments.");
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

  report.section("Curriculum Coverage", "How much of the uploaded dataset is represented by each dimension.");
  report.horizontalBars(
    extraAnalytics.coverage.items.slice(0, 12).map((item, index) => ({
      label: item.label,
      value: item.share,
      suffix: "%",
      color: item.status === "overrepresented" ? palette.orange : item.status === "underrepresented" ? palette.red : chartRgb(index),
      sublabel: `${item.count} records | ${item.status}`,
    })),
    Math.max(...extraAnalytics.coverage.items.map((item) => item.share), 1),
  );

  report.section("Relationship Strengths", "Statistical relationships only. These do not imply causation.");
  report.horizontalBars(
    extraAnalytics.relationships.links.slice(0, 10).map((link, index) => ({
      label: `${link.source} <> ${link.target}`,
      value: Math.abs(link.correlation) * 100,
      suffix: "%",
      color: link.correlation >= 0 ? chartRgb(index) : palette.red,
      sublabel: `${link.strength} | r=${formatChartValue(link.correlation)}`,
    })),
    100,
  );

  report.twoColumnLists(
    "Extra Signals",
    {
      title: "Coverage Flags",
      items: [...extraAnalytics.coverage.overrepresented, ...extraAnalytics.coverage.underrepresented].map(
        (item) => `${item.label} | ${item.status} | ${formatChartValue(item.share)}%`,
      ),
    },
    {
      title: "Pattern Signals",
      items: extraAnalytics.anomalies.map((item) => `${item.label} | ${item.type} | ${item.description}`),
    },
  );

  report.section("Assessment Intelligence", "Assessment-level spread, concentration, and dimension diversity.");
  report.horizontalBars(
    extraAnalytics.assessments.slice(0, 10).map((item, index) => ({
      label: item.label,
      value: item.variance,
      suffix: "",
      color: chartRgb(index + 1),
      sublabel: `diversity ${item.topicDiversity} | concentration ${formatChartValue(item.concentration)}%`,
    })),
    Math.max(...extraAnalytics.assessments.map((item) => item.variance), 1),
  );

  report.aiSummary(insight);
  report.finish();
  doc.save(`${safeFilename(fileName)}-extra-report.pdf`);
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

function createReportWriter(doc: jsPDF, fileName: string) {
  let y = page.margin;

  const setFill = (color: Rgb) => doc.setFillColor(color[0], color[1], color[2]);
  const setStroke = (color: Rgb) => doc.setDrawColor(color[0], color[1], color[2]);
  const setText = (color: Rgb) => doc.setTextColor(color[0], color[1], color[2]);

  function addPageIfNeeded(height = 100) {
    if (y + height <= page.height - page.bottom) {
      return;
    }

    doc.addPage();
    y = page.margin;
  }

  function writeWrapped(text: string, x: number, width: number, fontSize = 10, lineHeight = 14, color = palette.muted) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    setText(color);
    const lines = doc.splitTextToSize(text, width) as string[];
    lines.forEach((line) => {
      addPageIfNeeded(lineHeight + 4);
      doc.text(line, x, y);
      y += lineHeight;
    });
  }

  function section(title: string, subtitle?: string) {
    addPageIfNeeded(62);
    y += y === page.margin ? 0 : 8;
    setFill(palette.accent);
    doc.rect(page.margin, y - 2, 4, 21, "F");
    doc.setFont("helvetica", "bold");
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    setText(palette.white);
    doc.text("Classroom Analytics Report", page.margin, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(trimMiddle(fileName, 78), page.margin, 76);
    doc.text(`Generated locally ${new Date().toLocaleString()}`, page.margin, 92);

    y = 150;
    drawPrivacyBanner(analytics.recordCount);
  }

  function coverExtra(extraAnalytics: ExtraAnalyticsResult) {
    setFill([16, 20, 24]);
    doc.rect(0, 0, page.width, 118, "F");
    setFill([111, 91, 214]);
    doc.rect(0, 114, page.width, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    setText(palette.white);
    doc.text("Extra Classroom Intelligence Report", page.margin, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(trimMiddle(fileName, 78), page.margin, 76);
    doc.text(`Generated locally ${new Date().toLocaleString()}`, page.margin, 92);

    y = 150;
    drawPrivacyBanner(extraAnalytics.recordCount, "Advanced aggregate analytics computed in the browser. AI text, when present, used Extra findings only.");
  }

  function drawPrivacyBanner(
    recordCount: number,
    message = "All deterministic analytics were computed in the browser. AI text, when present, used aggregate findings only.",
  ) {
    setFill([239, 248, 245]);
    setStroke([188, 200, 192]);
    doc.rect(page.margin, y, page.width - page.margin * 2, 58, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(palette.accentDark);
    doc.text("Privacy-first export", page.margin + 14, y + 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(palette.muted);
    doc.text(message, page.margin + 14, y + 38);
    doc.text(`${recordCount.toLocaleString()} normalized records included in this report.`, page.width - page.margin - 188, y + 21);
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(palette.muted);
      doc.text(metric.label.toUpperCase(), x + 12, cardY + 18);
      doc.setFontSize(19);
      setText(palette.ink);
      doc.text(metric.value, x + 12, cardY + 42);
      doc.setFont("helvetica", "normal");
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setText(palette.ink);
      doc.text(trimLabel(item.label, 24), page.margin + 12, rowY);
      if (item.sublabel) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setText(palette.muted);
        doc.text(trimLabel(item.sublabel, 30), page.margin + 12, rowY + 10);
      }

      setFill([230, 235, 229]);
      doc.rect(barX, barY, chartWidth, 10, "F");
      setFill(item.color);
      doc.rect(barX, barY, barWidth, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setText(palette.ink);
      doc.text(`${formatChartValue(item.value)}${item.suffix}`, barX + chartWidth + 12, rowY);
    });

    y = startY + height + 14;
  }

  function trendSummary(analytics: AnalyticsResult) {
    const signal = analytics.trendSignals.overall;
    const hasTrend = signal.direction !== "insufficient_data";

    section("Trend Momentum", "Early-to-latest movement is emphasized before present-only performance.");
    addPageIfNeeded(130);
    const width = page.width - page.margin * 2;
    const cardY = y;

    setFill([248, 250, 247]);
    setStroke(palette.line);
    doc.rect(page.margin, cardY, width, 112, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(palette.muted);
    doc.text("OVERALL MOVEMENT", page.margin + 14, cardY + 22);

    doc.setFontSize(24);
    setText(hasTrend ? trendRgb(signal.direction) : palette.muted);
    doc.text(hasTrend ? formatSignedChange(signal.change) : "No signal", page.margin + 14, cardY + 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(palette.ink);
    const detail = hasTrend
      ? `${pct(signal.firstAverage)} in ${signal.firstLabel} to ${pct(signal.latestAverage)} in ${signal.latestLabel}.`
      : "At least two dated or ordered segments are needed for a movement signal.";
    doc.text(detail, page.margin + 14, cardY + 74);
    doc.text(`Direction: ${signal.direction.replace("_", " ")} | Slope: ${analytics.trend.slope}`, page.margin + 14, cardY + 91);

    const barX = page.margin + 350;
    const barY = cardY + 35;
    setFill([230, 235, 229]);
    doc.rect(barX, barY, 128, 10, "F");
    setFill(hasTrend ? trendRgb(signal.direction) : palette.muted);
    doc.rect(barX, barY, hasTrend ? Math.max(12, Math.min(128, Math.abs(signal.change) * 7 + 20)) : 12, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(palette.muted);
    doc.text("Movement magnitude", barX, barY + 25);

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
      doc.setFont("helvetica", "normal");
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
      doc.setFont("helvetica", "normal");
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

    doc.setFont("helvetica", "normal");
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
    section(title, "Category lists are sorted from deterministic local averages.");
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(palette.ink);
    doc.text(list.title, x + 12, cardY + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(palette.muted);
    (list.items.length ? list.items : ["Nothing to see here :p"]).slice(0, 5).forEach((item, index) => {
      doc.text(trimLabel(item, 40), x + 12, cardY + 42 + index * 17);
    });
  }

  function aiSummary(insight?: AiInsight) {
    section("AI Summary", "Aggregate-only explanation. No individual student analysis is included.");
    addPageIfNeeded(190);
    const width = page.width - page.margin * 2;
    setFill([248, 250, 247]);
    setStroke(palette.line);
    doc.rect(page.margin, y, width, 80, "FD");
    y += 22;

    if (insight?.summary) {
      writeWrapped(insight.summary, page.margin + 14, width - 28, 9.5, 13, palette.ink);
      y += 12;
      insightList("Trends", insight.trends);
      insightList("Instructional Focus", insight.instructionalFocus);
      insightList("Cautions", insight.cautions);
    } else {
      writeWrapped(
        "AI summary was not generated yet. The deterministic classroom analytics above are complete.",
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
    doc.setFont("helvetica", "bold");
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(palette.muted);
    doc.text("Nothing to see here :p", page.margin + 14, y + 31);
    y += 68;
  }

  function finish() {
    const pageCount = doc.getNumberOfPages();
    for (let index = 1; index <= pageCount; index += 1) {
      doc.setPage(index);
      setStroke(palette.line);
      doc.line(page.margin, page.height - 34, page.width - page.margin, page.height - 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(palette.muted);
      doc.text("Browser-only classroom analytics", page.margin, page.height - 18);
      doc.text(`Page ${index} of ${pageCount}`, page.width - page.margin - 56, page.height - 18);
    }
  }

  return {
    cover,
    coverExtra,
    metricGrid,
    section,
    horizontalBars,
    trendSummary,
    stackedBand,
    lineChart,
    twoColumnLists,
    aiSummary,
    emptyState,
    finish,
  };
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

function trendRgb(direction: AnalyticsResult["trend"]["direction"]): Rgb {
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
