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

type AppPhase = "upload" | "mapping" | "dashboard";
type WorkspaceMode = "overview" | "extra" | "exports" | "formulas" | "architecture";

type AnalyticsStore = {
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
  phase: "upload",
  inferences: [],
  mappings: [],
  isParsing: false,
  isAnalyzing: false,
  workspaceMode: "overview",
  parseProgress: 0,
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
