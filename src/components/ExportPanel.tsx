"use client";

import { Download, FileArchive, FileJson, FileText } from "lucide-react";
import { exportAiSummary, exportAnalytics, exportNormalizedDataset, exportPdfReport } from "@/lib/exporters";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function ExportPanel() {
  const { parsedCsv, normalized, analytics, mappings, aiInsight } = useAnalyticsStore();

  if (!parsedCsv || !normalized || !analytics) {
    return null;
  }

  return (
    <section className="metric-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Download className="h-5 w-5 text-[#16726d]" />
          Exports
        </h2>
        <span className="text-xs text-[#5b635f]">Local files</span>
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

      <div className="mt-4 grid gap-2 text-sm text-[#4f5954]">
        <div>Source rows: {normalized.summary.sourceRows.toLocaleString()}</div>
        <div>Normalized records: {normalized.summary.normalizedRecords.toLocaleString()}</div>
        <div>Skipped values: {normalized.summary.skippedValues.toLocaleString()}</div>
      </div>
    </section>
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
      className="inline-flex items-center justify-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-3 text-sm font-semibold hover:bg-[#f1f4f1] disabled:cursor-not-allowed disabled:text-[#9aa39e]"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
