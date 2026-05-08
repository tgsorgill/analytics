"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Dashboard } from "@/components/Dashboard";
import { CsvUpload } from "@/components/CsvUpload";
import { LanguageGate } from "@/components/LanguageGate";
import { normalizeRows } from "@/lib/normalize";
import { validateMappings } from "@/lib/mapping";
import { computeAnalyticsInWorker } from "@/hooks/useAnalyticsWorker";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { configuredHfToken, defaultAiModel, requestAiInsight } from "@/lib/huggingFace";
import { t } from "@/lib/i18n";

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
    locale,
  } = useAnalyticsStore();
  const autoRunKey = useRef<string | null>(null);
  const mounted = useClientMounted();

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
          locale,
        })
          .then(setAiInsight)
          .catch(() => {
            setAiInsight({
              summary: t(locale, "ai.unavailable"),
              trends: [],
              instructionalFocus: [],
              cautions: [locale === "mn" ? "AI ашиглах боломжтой ангийн хураангуй буцаасангүй." : "AI did not return a usable classroom summary."],
              chartSuggestions: [],
            });
          });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : locale === "mn" ? "Аналитик амжилтгүй боллоо." : "Analytics failed.");
    } finally {
      setAnalyzing(false);
    }
  }, [
    locale,
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

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen">
      <LanguageGate />
      {phase === "upload" ? <CsvUpload /> : null}
      {phase === "mapping" ? (
        <AutoProcessingPanel
          locale={locale}
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

function useClientMounted() {
  return useSyncExternalStore(
    (notify) => {
      const id = window.setTimeout(notify, 0);
      return () => window.clearTimeout(id);
    },
    () => true,
    () => false,
  );
}

function AutoProcessingPanel({
  locale,
  canRun,
  isAnalyzing,
  onRetry,
  onReset,
}: {
  locale: ReturnType<typeof useAnalyticsStore.getState>["locale"];
  canRun: boolean;
  isAnalyzing: boolean;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-4 py-10">
      <div className="metric-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "processing.kicker")}</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {canRun ? t(locale, "processing.readyTitle") : t(locale, "processing.blockedTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#4f5954]">
          {canRun ? t(locale, "processing.readyBody") : t(locale, "processing.blockedBody")}
        </p>
        <div className="mt-5 flex gap-2">
          {canRun ? (
            <button
              className="rounded bg-[#16726d] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#90aaa7]"
              type="button"
              disabled={isAnalyzing}
              onClick={onRetry}
            >
              {isAnalyzing ? t(locale, "processing.analyzing") : t(locale, "processing.runNow")}
            </button>
          ) : null}
          <button
            className="rounded border border-[#bec8c0] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f1f4f1]"
            type="button"
            onClick={onReset}
          >
            {t(locale, "common.newUpload")}
          </button>
        </div>
      </div>
    </section>
  );
}
