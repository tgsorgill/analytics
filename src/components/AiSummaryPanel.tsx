"use client";

import { useState } from "react";
import { Bot, ChartNoAxesColumn, Sparkles } from "lucide-react";
import { alternateAiModel, configuredHfToken, defaultAiModel, requestAiInsight } from "@/lib/huggingFace";
import { localizeLabel, t } from "@/lib/i18n";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function AiSummaryPanel() {
  const { locale, analytics, aiInsight, setAiInsight, setError } = useAnalyticsStore();
  const [model, setModel] = useState(defaultAiModel);
  const [isLoading, setIsLoading] = useState(false);
  const token = configuredHfToken;

  async function generateInsight() {
    if (!analytics || !token) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const insight = await requestAiInsight({
        token,
        model,
        analytics,
        locale,
      });
      setAiInsight(insight);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(locale, "ai.failed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="metric-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Bot className="h-5 w-5 text-[#16726d]" />
          {t(locale, "ai.title")}
        </h2>
        <span className="text-xs text-[#5b635f]">{t(locale, "common.aggregateOnly")}</span>
      </div>

      <div className="grid gap-3">
        <div className="rounded border border-[#d9ded8] bg-[#f7f7f2] p-3 text-sm text-[#4f5954]">
          {token
            ? t(locale, "ai.configured")
            : t(locale, "ai.notConfigured")}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t(locale, "ai.model")}</span>
          <select
            className="rounded border border-[#bec8c0] bg-white px-2 py-2"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value={defaultAiModel}>Qwen2.5 7B Instruct</option>
            <option value={alternateAiModel}>Qwen2.5 14B Instruct</option>
          </select>
        </label>

        <button
          className="inline-flex w-fit items-center gap-2 rounded bg-[#16726d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5a55] disabled:cursor-not-allowed disabled:bg-[#90aaa7]"
          type="button"
          disabled={!analytics || !token || isLoading}
          onClick={() => void generateInsight()}
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? t(locale, "ai.generating") : t(locale, "ai.generate")}
        </button>
      </div>

      {aiInsight ? (
        <div className="mt-5 flex flex-col gap-4 border-t border-[#d9ded8] pt-4 text-sm">
          <p className="leading-6">{toPanelText(aiInsight.summary)}</p>
          <InsightList title={t(locale, "ai.trends")} items={aiInsight.trends} />
          <InsightList title={t(locale, "ai.focus")} items={aiInsight.instructionalFocus} />
          <InsightList title={t(locale, "ai.cautions")} items={aiInsight.cautions} />
          <ChartSuggestionList suggestions={aiInsight.chartSuggestions} />
        </div>
      ) : null}
    </section>
  );
}

function InsightList({ title, items }: { title: string; items: unknown[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>- {toPanelText(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function ChartSuggestionList({
  suggestions,
}: {
  suggestions: {
    type: string;
    title: string;
    rationale: string;
    priority?: number;
  }[];
}) {
  const { locale } = useAnalyticsStore();
  if (!suggestions.length) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 inline-flex items-center gap-2 font-semibold">
        <ChartNoAxesColumn className="h-4 w-4 text-[#16726d]" />
        {t(locale, "ai.visualGuidance")}
      </h3>
      <div className="grid gap-2">
        {suggestions
          .slice()
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
          .map((suggestion, index) => (
            <div key={`${suggestion.title}-${index}`} className="rounded border border-[#d9ded8] bg-[#f7f7f2] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{localizeLabel(toPanelText(suggestion.title), locale)}</span>
                <span className="rounded bg-[#e4edf5] px-2 py-1 text-xs font-medium text-[#254f78]">
                  {localizeLabel(toPanelText(suggestion.type), locale)}
                </span>
              </div>
              {suggestion.rationale ? <p className="mt-2 text-[#4f5954]">{toPanelText(suggestion.rationale)}</p> : null}
            </div>
          ))}
      </div>
    </div>
  );
}

function toPanelText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toPanelText).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${toPanelText(entry)}`)
      .join("; ");
  }

  return String(value);
}
