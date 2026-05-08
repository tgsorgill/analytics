"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { parseCsvFile } from "@/lib/csv";
import { inferSchema } from "@/lib/schemaInference";
import { mappingsFromInference } from "@/lib/mapping";
import { configuredHfToken, defaultAiModel, requestAiColumnMappings } from "@/lib/huggingFace";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { cn } from "@/lib/utils";

export function CsvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { isParsing, parseProgress, setParsedCsv, setParsing, setParseProgress, setError, setAiInsight, setExtraAiInsight, setExtraAnalytics, error } =
    useAnalyticsStore();

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload a CSV file.");
      return;
    }

    setParsing(true);
    setParseProgress(0);
    setError(undefined);
    setAiInsight(undefined);
    setExtraAiInsight(undefined);
    setExtraAnalytics(undefined);

    try {
      const parsed = await parseCsvFile(file, setParseProgress);
      const inferences = inferSchema(parsed.rows, parsed.columns);
      const fallbackMappings = mappingsFromInference(inferences);
      const mappings = configuredHfToken
        ? await requestAiColumnMappings({
            token: configuredHfToken,
            model: defaultAiModel,
            inferences,
            fallbackMappings,
          }).catch(() => fallbackMappings)
        : fallbackMappings;
      setParsedCsv(parsed, inferences, mappings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV parsing failed.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <FileSpreadsheet className="h-4 w-4" />
          Local-first classroom analytics
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#1c1f23]">
          Upload school CSVs and inspect classroom-level analytics.
        </h1>
      </div>

      <div
        className={cn(
          "flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-white px-6 py-10 text-center transition",
          dragging ? "border-[#16726d] bg-[#eef8f5]" : "border-[#bec8c0]",
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded bg-[#dff1e8] text-[#0f5a55]">
          <Upload className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">Drop a CSV file or browse</p>
          <p className="text-sm text-[#5b635f]">
            Rows stay in browser memory. The app only asks for mapping help when the score column is unclear.
          </p>
        </div>
        <button
          className="rounded bg-[#16726d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5a55]"
          type="button"
        >
          Select CSV
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      {isParsing ? (
        <div className="metric-panel p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Parsing and interpreting CSV</span>
            <span>{parseProgress.toLocaleString()} rows</span>
          </div>
          <div className="h-2 rounded bg-[#d9ded8]">
            <div className="h-2 w-2/3 animate-pulse rounded bg-[#16726d]" />
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded border border-[#e2aaa1] bg-[#fae2de] p-3 text-sm text-[#8a2f24]">{error}</div> : null}

      <div className="grid gap-3 text-sm text-[#3f4642] md:grid-cols-4">
        <div className="metric-panel p-4">No database</div>
        <div className="metric-panel p-4">No authentication</div>
        <div className="metric-panel p-4">No raw CSV to AI</div>
        <div className="metric-panel p-4">Local exports</div>
      </div>
    </section>
  );
}
