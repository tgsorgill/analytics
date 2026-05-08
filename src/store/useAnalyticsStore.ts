"use client";

import { create } from "zustand";
import type {
  AiInsight,
  AnalyticsResult,
  ColumnInference,
  ColumnMapping,
  ExtraAnalyticsResult,
  MappingValidation,
  NormalizationResult,
  ParsedCsv,
} from "@/lib/types";
import type { Locale } from "@/lib/i18n";

type AppPhase = "upload" | "mapping" | "dashboard";
type WorkspaceMode = "overview" | "individual" | "extra" | "exports" | "formulas" | "architecture";

type AnalyticsStore = {
  locale: Locale;
  localePromptOpen: boolean;
  phase: AppPhase;
  parsedCsv?: ParsedCsv;
  inferences: ColumnInference[];
  mappings: ColumnMapping[];
  mappingValidation?: MappingValidation;
  normalized?: NormalizationResult;
  analytics?: AnalyticsResult;
  extraAnalytics?: ExtraAnalyticsResult;
  aiInsight?: AiInsight;
  extraAiInsight?: AiInsight;
  workspaceMode: WorkspaceMode;
  isParsing: boolean;
  isAnalyzing: boolean;
  parseProgress: number;
  error?: string;
  setLocale: (locale: Locale) => void;
  openLocalePrompt: () => void;
  dismissLocalePrompt: () => void;
  setParsedCsv: (parsedCsv: ParsedCsv, inferences: ColumnInference[], mappings: ColumnMapping[]) => void;
  updateMapping: (column: string, patch: Partial<ColumnMapping>) => void;
  setMappingValidation: (validation: MappingValidation) => void;
  setNormalized: (normalized: NormalizationResult) => void;
  setAnalytics: (analytics: AnalyticsResult) => void;
  setExtraAnalytics: (extraAnalytics?: ExtraAnalyticsResult) => void;
  setAiInsight: (aiInsight?: AiInsight) => void;
  setExtraAiInsight: (extraAiInsight?: AiInsight) => void;
  setWorkspaceMode: (workspaceMode: WorkspaceMode) => void;
  setParsing: (isParsing: boolean) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setParseProgress: (parseProgress: number) => void;
  setError: (error?: string) => void;
  reset: () => void;
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  locale: readInitialLocale(),
  localePromptOpen: shouldOpenLocalePrompt(),
  phase: "upload",
  inferences: [],
  mappings: [],
  isParsing: false,
  isAnalyzing: false,
  workspaceMode: "overview",
  parseProgress: 0,
  setLocale: (locale) => {
    persistLocale(locale);
    markLocalePromptSeen();
    set({ locale, localePromptOpen: false, aiInsight: undefined, extraAiInsight: undefined });
  },
  openLocalePrompt: () => set({ localePromptOpen: true }),
  dismissLocalePrompt: () => {
    markLocalePromptSeen();
    set({ localePromptOpen: false });
  },
  setParsedCsv: (parsedCsv, inferences, mappings) =>
    set({
      parsedCsv,
      inferences,
      mappings,
      mappingValidation: undefined,
      normalized: undefined,
      analytics: undefined,
      extraAnalytics: undefined,
      aiInsight: undefined,
      extraAiInsight: undefined,
      workspaceMode: "overview",
      phase: "mapping",
      error: undefined,
    }),
  updateMapping: (column, patch) =>
    set((state) => ({
      mappings: state.mappings.map((mapping) =>
        mapping.column === column
          ? {
              ...mapping,
              ...patch,
            }
          : mapping,
      ),
    })),
  setMappingValidation: (mappingValidation) => set({ mappingValidation }),
  setNormalized: (normalized) => set({ normalized }),
  setAnalytics: (analytics) => set({ analytics, phase: "dashboard" }),
  setExtraAnalytics: (extraAnalytics) => set({ extraAnalytics }),
  setAiInsight: (aiInsight) => set({ aiInsight }),
  setExtraAiInsight: (extraAiInsight) => set({ extraAiInsight }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  setParsing: (isParsing) => set({ isParsing }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setParseProgress: (parseProgress) => set({ parseProgress }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      phase: "upload",
      parsedCsv: undefined,
      inferences: [],
      mappings: [],
      mappingValidation: undefined,
      normalized: undefined,
      analytics: undefined,
      extraAnalytics: undefined,
      aiInsight: undefined,
      extraAiInsight: undefined,
      workspaceMode: "overview",
      isParsing: false,
      isAnalyzing: false,
      parseProgress: 0,
      error: undefined,
    }),
}));

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem("classroom_analytics_locale") ?? readCookie("classroom_analytics_locale");
  return stored === "mn" ? "mn" : "en";
}

function shouldOpenLocalePrompt() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem("classroom_analytics_locale_seen") !== "1";
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("classroom_analytics_locale", locale);
  document.cookie = `classroom_analytics_locale=${locale}; max-age=31536000; path=/; SameSite=Lax`;
}

function markLocalePromptSeen() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem("classroom_analytics_locale_seen", "1");
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
