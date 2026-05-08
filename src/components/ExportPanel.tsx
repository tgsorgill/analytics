"use client";

import { useState } from "react";
import { Download, FileArchive, FileJson, FileText } from "lucide-react";
import { computeExtraAnalyticsInWorker } from "@/hooks/useExtraAnalyticsWorker";
import {
  exportAiSummary,
  exportAnalytics,
  exportExtraAiSummary,
  exportExtraAnalytics,
  exportExtraNormalizedDataset,
  exportExtraPdfReport,
  exportNormalizedDataset,
  exportPdfReport,
} from "@/lib/exporters";
import { configuredHfToken, defaultAiModel, requestExtraAiInsight } from "@/lib/huggingFace";
import type { ExtraAnalyticsResult } from "@/lib/types";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function ExportPanel() {
  const {
    parsedCsv,
    normalized,
    analytics,
    mappings,
    aiInsight,
    extraAnalytics,
    setExtraAnalytics,
    extraAiInsight,
    setExtraAiInsight,
    setError,
  } = useAnalyticsStore();
  const [extraExporting, setExtraExporting] = useState<string | null>(null);

  if (!parsedCsv || !normalized || !analytics) {
    return null;
  }

  async function ensureExtraAnalytics() {
    if (extraAnalytics) {
      return extraAnalytics;
    }

    if (!normalized?.records.length) {
      throw new Error("No normalized records are available for Extra export.");
    }

    const computed = await computeExtraAnalyticsInWorker(normalized.records);
    setExtraAnalytics(computed);
    return computed;
  }

  async function ensureExtraAiInsight(extra: ExtraAnalyticsResult) {
    if (extraAiInsight) {
      return extraAiInsight;
    }

    if (!configuredHfToken) {
      throw new Error("Extra AI summary export needs NEXT_PUBLIC_HF_TOKEN configured.");
    }

    const insight = await requestExtraAiInsight({
      token: configuredHfToken,
      model: defaultAiModel,
      extraAnalytics: extra,
    });
    setExtraAiInsight(insight);
    return insight;
  }

  async function runExtraExport(id: string, action: (extra: ExtraAnalyticsResult) => void | Promise<void>) {
    setExtraExporting(id);
    setError(undefined);
    try {
      const extra = await ensureExtraAnalytics();
      await action(extra);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Extra export failed.");
    } finally {
      setExtraExporting(null);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="metric-panel interactive-panel reveal-up p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <Download className="h-5 w-5 text-[#16726d]" />
              Overview exports
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5b635f]">
              Download the normalized dataset, computed analytics, AI summary, or complete PDF report for the main dashboard.
            </p>
          </div>
          <span className="rounded border border-[#d9ded8] bg-[#f7faf7] px-2 py-1 text-xs font-semibold text-[#4f5954]">
            Local files
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ExportButton
            icon={<FileJson className="h-4 w-4" />}
            label="Normalized JSON"
            onClick={() => exportNormalizedDataset(parsedCsv.fileName, normalized)}
          />
          <ExportButton
            icon={<FileJson className="h-4 w-4" />}
            label="Analytics JSON"
            onClick={() => exportAnalytics(parsedCsv.fileName, analytics, mappings)}
          />
          <ExportButton
            icon={<FileText className="h-4 w-4" />}
            label="AI Summary"
            disabled={!aiInsight}
            onClick={() => aiInsight && exportAiSummary(parsedCsv.fileName, aiInsight)}
          />
          <ExportButton
            icon={<FileArchive className="h-4 w-4" />}
            label="PDF Report"
            onClick={() => exportPdfReport(parsedCsv.fileName, analytics, aiInsight)}
          />
        </div>
      </div>

      <div className="metric-panel interactive-panel reveal-up p-5 sm:p-6" style={{ animationDelay: "70ms" }}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <FileArchive className="h-5 w-5 text-[#c65d21]" />
              Extra exports
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5b635f]">
              Package the advanced workspace outputs. Extra analytics compute locally on demand when they are not already cached.
            </p>
          </div>
          <span className="rounded border border-[#d9ded8] bg-[#fff6eb] px-2 py-1 text-xs font-semibold text-[#8a3d13]">
            Advanced
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ExportButton
            icon={<FileJson className="h-4 w-4" />}
            label={extraExporting === "extra-normalized" ? "Preparing Extra JSON" : "Extra Normalized JSON"}
            disabled={Boolean(extraExporting)}
            onClick={() =>
              void runExtraExport("extra-normalized", (extra) =>
                exportExtraNormalizedDataset(parsedCsv.fileName, normalized, extra),
              )
            }
          />
          <ExportButton
            icon={<FileJson className="h-4 w-4" />}
            label={extraExporting === "extra-analytics" ? "Preparing Extra JSON" : "Extra Analytics JSON"}
            disabled={Boolean(extraExporting)}
            onClick={() =>
              void runExtraExport("extra-analytics", (extra) => exportExtraAnalytics(parsedCsv.fileName, extra))
            }
          />
          <ExportButton
            icon={<FileText className="h-4 w-4" />}
            label={extraExporting === "extra-ai" ? "Preparing Extra AI" : "Extra AI Summary"}
            disabled={Boolean(extraExporting) || !configuredHfToken}
            onClick={() =>
              void runExtraExport("extra-ai", async (extra) => {
                const insight = await ensureExtraAiInsight(extra);
                exportExtraAiSummary(parsedCsv.fileName, insight);
              })
            }
          />
          <ExportButton
            icon={<FileArchive className="h-4 w-4" />}
            label={extraExporting === "extra-pdf" ? "Preparing Extra PDF" : "Extra PDF Report"}
            disabled={Boolean(extraExporting)}
            onClick={() =>
              void runExtraExport("extra-pdf", async (extra) => {
                const insight =
                  extraAiInsight ??
                  (configuredHfToken ? await ensureExtraAiInsight(extra).catch(() => undefined) : undefined);
                exportExtraPdfReport(parsedCsv.fileName, extra, insight);
              })
            }
          />
        </div>
      </div>

      <div className="metric-panel reveal-up p-5 sm:p-6 lg:col-span-2" style={{ animationDelay: "120ms" }}>
        <h3 className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">Current dataset package</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryStat label="Source rows" value={normalized.summary.sourceRows.toLocaleString()} />
          <SummaryStat label="Normalized records" value={normalized.summary.normalizedRecords.toLocaleString()} />
          <SummaryStat label="Skipped values" value={normalized.summary.skippedValues.toLocaleString()} />
        </div>
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-4">
      <div className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ExportButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-14 items-center justify-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md disabled:cursor-not-allowed disabled:text-[#9aa39e] disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:shadow-none"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
