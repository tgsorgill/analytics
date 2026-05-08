"use client";

import { useCallback, useEffect, useRef } from "react";
import { Dashboard } from "@/components/Dashboard";
import { CsvUpload } from "@/components/CsvUpload";
import { normalizeRows } from "@/lib/normalize";
import { validateMappings } from "@/lib/mapping";
import { computeAnalyticsInWorker } from "@/hooks/useAnalyticsWorker";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { configuredHfToken, defaultAiModel, requestAiInsight } from "@/lib/huggingFace";

export function AnalyticsApp() {
  const {
    phase,
    parsedCsv,
    mappings,
    setMappingValidation,
    setNormalized,
    setAnalytics,
    setExtraAnalytics,
    setAiInsight,
    setExtraAiInsight,
    isAnalyzing,
    setAnalyzing,
    setError,
    reset,
    error,
  } = useAnalyticsStore();
  const autoRunKey = useRef<string | null>(null);

  const runAnalytics = useCallback(async () => {
    if (!parsedCsv) {
      return;
    }

    const validation = validateMappings(mappings);
    setMappingValidation(validation);

    if (!validation.canProceed) {
      return;
    }

    setAnalyzing(true);
    setError(undefined);
    setAiInsight(undefined);
    setExtraAiInsight(undefined);
    setExtraAnalytics(undefined);

    try {
      const normalized = normalizeRows(parsedCsv.rows, mappings);
      if (!normalized.records.length) {
        setNormalized(normalized);
        setError("No parseable score records were produced from the confirmed mappings.");
        return;
      }

      setNormalized(normalized);
      const analytics = await computeAnalyticsInWorker(normalized.records);
      setAiInsight(undefined);
      setExtraAiInsight(undefined);
      setExtraAnalytics(undefined);
      setAnalytics(analytics);

      if (configuredHfToken) {
        void requestAiInsight({
          token: configuredHfToken,
          model: defaultAiModel,
          analytics,
        })
          .then(setAiInsight)
          .catch(() => {
            setAiInsight({
              summary: "AI summary was unavailable for this run. Deterministic charts and exports are still available.",
              trends: [],
              instructionalFocus: [],
              cautions: ["AI did not return a usable classroom summary."],
              chartSuggestions: [],
            });
          });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analytics failed.");
    } finally {
      setAnalyzing(false);
    }
  }, [
    mappings,
    parsedCsv,
    setAiInsight,
    setAnalytics,
    setAnalyzing,
    setError,
    setExtraAiInsight,
    setExtraAnalytics,
    setMappingValidation,
    setNormalized,
  ]);

  useEffect(() => {
    if (phase === "upload") {
      autoRunKey.current = null;
    }
  }, [phase]);

  useEffect(() => {
    if (!parsedCsv || phase !== "mapping") {
      return;
    }

    const validation = validateMappings(mappings);
    const key = `${parsedCsv.fileName}:${parsedCsv.rowCount}:${parsedCsv.columns.join("|")}`;
    if (validation.canProceed && autoRunKey.current !== key) {
      autoRunKey.current = key;
      void runAnalytics();
    }
  }, [mappings, parsedCsv, phase, runAnalytics]);

  return (
    <div className="min-h-screen">
      {phase === "upload" ? <CsvUpload /> : null}
      {phase === "mapping" ? (
        <AutoProcessingPanel
          canRun={parsedCsv ? validateMappings(mappings).canProceed : false}
          isAnalyzing={isAnalyzing}
          onRetry={() => void runAnalytics()}
          onReset={reset}
        />
      ) : null}
      {phase === "dashboard" ? <Dashboard /> : null}
      {error && phase !== "upload" ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded border border-[#e2aaa1] bg-[#fae2de] px-4 py-3 text-sm text-[#8a2f24] shadow-lg">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function AutoProcessingPanel({
  canRun,
  isAnalyzing,
  onRetry,
  onReset,
}: {
  canRun: boolean;
  isAnalyzing: boolean;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-4 py-10">
      <div className="metric-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">Automatic interpretation</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {canRun ? "Preparing deterministic analytics." : "No score or metric column was found."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#4f5954]">
          {canRun
            ? "The app interpreted the column headers automatically and is running local calculations."
            : "Try a CSV with at least one score-like column such as percentage, points earned, grade, average, rating, or proficiency."}
        </p>
        <div className="mt-5 flex gap-2">
          {canRun ? (
            <button
              className="rounded bg-[#16726d] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#90aaa7]"
              type="button"
              disabled={isAnalyzing}
              onClick={onRetry}
            >
              {isAnalyzing ? "Analyzing" : "Run now"}
            </button>
          ) : null}
          <button
            className="rounded border border-[#bec8c0] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f1f4f1]"
            type="button"
            onClick={onReset}
          >
            New upload
          </button>
        </div>
      </div>
    </section>
  );
}
