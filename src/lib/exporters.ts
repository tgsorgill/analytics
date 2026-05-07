"use client";

import { jsPDF } from "jspdf";
import type { AiInsight, AnalyticsResult, ColumnMapping, NormalizationResult } from "@/lib/types";
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

export function exportAiSummary(fileName: string, insight: AiInsight) {
  downloadText(
    `${safeFilename(fileName)}-ai-summary.txt`,
    [
      "AI Summary",
      `Exported: ${new Date().toISOString()}`,
      "",
      insight.summary,
      "",
      "Trends",
      ...insight.trends.map((trend) => `- ${trend}`),
      "",
      "Instructional Focus",
      ...insight.instructionalFocus.map((focus) => `- ${focus}`),
      "",
      "Cautions",
      ...insight.cautions.map((caution) => `- ${caution}`),
    ].join("\n"),
  );
}

export function exportPdfReport(fileName: string, analytics: AnalyticsResult, insight?: AiInsight) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  const addPageIfNeeded = (height = 80) => {
    if (y + height > 744) {
      doc.addPage();
      y = margin;
    }
  };

  const writeTitle = (text: string) => {
    addPageIfNeeded(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, margin, y);
    y += 20;
  };

  const writeLines = (lines: string[], fontSize = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    for (const line of lines.flatMap((line) => doc.splitTextToSize(line, 500))) {
      addPageIfNeeded(18);
      doc.text(line, margin, y);
      y += 15;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Classroom Analytics Report", margin, y);
  y += 24;

  writeLines([`Generated locally: ${new Date().toLocaleString()}`], 10);
  y += 10;

  writeTitle("Overview");
  writeLines([
    `Records: ${analytics.recordCount}`,
    `Average: ${analytics.overview.mean}%`,
    `Median: ${analytics.overview.median}%`,
    `Standard deviation: ${analytics.overview.standardDeviation}`,
    `Mastery rate: ${analytics.overview.masteryRate}%`,
    `Consistency score: ${analytics.overview.consistencyScore}%`,
  ]);

  y += 10;
  drawBarChart({
    doc,
    title: "Category Performance",
    data: analytics.chartData.topicPerformance.slice(0, 8).map((item) => ({
      label: item.topic,
      value: item.average,
      color: [22, 114, 109],
    })),
    yRef: {
      get: () => y,
      set: (next) => {
        y = next;
      },
    },
    addPageIfNeeded,
    margin,
    maxValue: 100,
    valueSuffix: "%",
  });

  drawBarChart({
    doc,
    title: "Score Distribution",
    data: analytics.chartData.distribution.map((item) => ({
      label: item.label,
      value: item.count,
      color: [198, 93, 33],
    })),
    yRef: {
      get: () => y,
      set: (next) => {
        y = next;
      },
    },
    addPageIfNeeded,
    margin,
    maxValue: Math.max(...analytics.chartData.distribution.map((item) => item.count), 1),
    valueSuffix: "",
  });

  drawBarChart({
    doc,
    title: "Performance Clusters",
    data: analytics.chartData.clusters.map((item, index) => ({
      label: item.label,
      value: item.count,
      color: chartRgb(index),
    })),
    yRef: {
      get: () => y,
      set: (next) => {
        y = next;
      },
    },
    addPageIfNeeded,
    margin,
    maxValue: Math.max(...analytics.chartData.clusters.map((item) => item.count), 1),
    valueSuffix: "",
  });

  if (analytics.chartData.trend.length > 1) {
    drawLineChart({
      doc,
      title: "Trend Over Time",
      data: analytics.chartData.trend.map((item) => ({
        label: item.date,
        value: item.average,
      })),
      yRef: {
        get: () => y,
        set: (next) => {
          y = next;
        },
      },
      addPageIfNeeded,
      margin,
    });
  }

  y += 8;
  writeTitle("Weakest Categories");
  writeLines(analytics.weakTopics.map((topic) => `${topic.topic}: ${topic.average}% (${topic.count} records)`));

  y += 8;
  writeTitle("Strongest Categories");
  writeLines(analytics.strongTopics.map((topic) => `${topic.topic}: ${topic.average}% (${topic.count} records)`));

  y += 12;
  writeTitle("AI Summary");
  if (insight?.summary) {
    writeLines([
      insight.summary,
      "",
      "Trends",
      ...insight.trends.map((trend) => `- ${trend}`),
      "",
      "Instructional Focus",
      ...insight.instructionalFocus.map((focus) => `- ${focus}`),
      "",
      "Cautions",
      ...insight.cautions.map((caution) => `- ${caution}`),
    ]);
  } else {
    writeLines(["AI summary was not generated yet. The deterministic classroom analytics above are complete."]);
  }

  doc.save(`${safeFilename(fileName)}-report.pdf`);
}

function drawBarChart({
  doc,
  title,
  data,
  yRef,
  addPageIfNeeded,
  margin,
  maxValue,
  valueSuffix,
}: {
  doc: jsPDF;
  title: string;
  data: { label: string; value: number; color: number[] }[];
  yRef: { get: () => number; set: (next: number) => void };
  addPageIfNeeded: (height?: number) => void;
  margin: number;
  maxValue: number;
  valueSuffix: string;
}) {
  if (!data.length) {
    return;
  }

  addPageIfNeeded(190);
  let y = yRef.get();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 18;

  const chartWidth = 500;
  const chartHeight = 120;
  const barGap = 8;
  const barWidth = Math.max(14, (chartWidth - barGap * (data.length - 1)) / data.length);
  const baseline = y + chartHeight;

  doc.setDrawColor(217, 222, 216);
  doc.line(margin, baseline, margin + chartWidth, baseline);

  data.forEach((item, index) => {
    const height = maxValue ? (item.value / maxValue) * chartHeight : 0;
    const x = margin + index * (barWidth + barGap);
    const barY = baseline - height;
    const [r, g, b] = item.color;

    doc.setFillColor(r, g, b);
    doc.rect(x, barY, barWidth, height, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${Math.round(item.value)}${valueSuffix}`, x, Math.max(12, barY - 4));
    doc.text(trimLabel(item.label, 13), x, baseline + 12, { angle: 25 });
  });

  yRef.set(baseline + 48);
}

function drawLineChart({
  doc,
  title,
  data,
  yRef,
  addPageIfNeeded,
  margin,
}: {
  doc: jsPDF;
  title: string;
  data: { label: string; value: number }[];
  yRef: { get: () => number; set: (next: number) => void };
  addPageIfNeeded: (height?: number) => void;
  margin: number;
}) {
  addPageIfNeeded(190);
  let y = yRef.get();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 18;

  const chartWidth = 500;
  const chartHeight = 120;
  const baseline = y + chartHeight;
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
  const points = data.map((item, index) => ({
    x: margin + index * step,
    y: baseline - (item.value / 100) * chartHeight,
  }));

  doc.setDrawColor(217, 222, 216);
  doc.rect(margin, y, chartWidth, chartHeight);
  doc.setDrawColor(47, 105, 161);
  doc.setLineWidth(1.5);
  points.forEach((point, index) => {
    if (index > 0) {
      const previous = points[index - 1];
      doc.line(previous.x, previous.y, point.x, point.y);
    }
    doc.circle(point.x, point.y, 2.5, "F");
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.forEach((item, index) => {
    if (index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 4) === 0) {
      doc.text(trimLabel(item.label, 12), margin + index * step, baseline + 12, { angle: 25 });
    }
  });

  yRef.set(baseline + 48);
}

function trimLabel(label: string, length: number) {
  return label.length > length ? `${label.slice(0, length - 1)}.` : label;
}

function chartRgb(index: number) {
  const colors = [
    [22, 114, 109],
    [47, 105, 161],
    [198, 93, 33],
    [184, 134, 11],
  ];

  return colors[index % colors.length];
}
