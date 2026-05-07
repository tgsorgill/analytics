"use client";

import { Calculator, LineChart, Sigma, Target } from "lucide-react";
import type { AnalyticsResult } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const clusterDefinitions = [
  {
    label: "Needs support",
    range: "0-59%",
    body: "Records below the classroom proficiency band. This is a statistical grouping only, not a student label.",
    color: "#16726d",
  },
  {
    label: "Approaching",
    range: "60-74%",
    body: "Records moving toward proficiency, useful for seeing where reteaching may help the whole group.",
    color: "#2f69a1",
  },
  {
    label: "Proficient",
    range: "75-89%",
    body: "Records in the expected performance band for the dashboard's deterministic breakdown.",
    color: "#c65d21",
  },
  {
    label: "Advanced",
    range: "90-100%",
    body: "Records in the highest local performance band. Scores above 100 are clamped only for distribution charts.",
    color: "#b8860b",
  },
];

const formulas = [
  {
    icon: Target,
    title: "Mastery Rate",
    formula: "count(score >= 80%) / total scored records * 100",
    body: "The share of records at or above the mastery threshold. It is computed after every score is converted to a 0-100 percentage.",
  },
  {
    icon: Calculator,
    title: "Average",
    formula: "sum(percent scores) / number of percent scores",
    body: "The mean classroom score across the selected normalized records.",
  },
  {
    icon: Sigma,
    title: "Median",
    formula: "middle value after sorting scores",
    body: "The center score. If there are two middle values, the app averages those two values.",
  },
  {
    icon: Sigma,
    title: "Standard Deviation",
    formula: "sqrt(sum((score - average)^2) / count)",
    body: "A spread measure. Higher values mean the record set is more varied.",
  },
  {
    icon: Target,
    title: "Consistency Score",
    formula: "clamp(100 - standard deviation, 0, 100)",
    body: "A simple stability indicator. It rewards tighter score spread and stays between 0 and 100.",
  },
  {
    icon: LineChart,
    title: "Trend Direction",
    formula: "linear slope across dated average scores",
    body: "Improving, declining, or flat is based on the slope of dated classroom averages. Without enough dates, the trend is marked insufficient.",
  },
  {
    icon: Calculator,
    title: "Variance",
    formula: "standard deviation ^ 2",
    body: "Used for topic and subject spread analysis. High variance means scores in that grouping are less uniform.",
  },
  {
    icon: Target,
    title: "Topic Strength / Weakness",
    formula: "average score by category, topic, skill, assessment, or metric",
    body: "The dashboard sorts category averages. Lowest averages become weak areas; highest averages become strong areas.",
  },
];

export function FormulasWorkspace({ analytics }: { analytics: AnalyticsResult }) {
  return (
    <section className="workspace-page reveal-up flex flex-col gap-5">
      <div className="metric-panel interactive-panel p-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <Calculator className="h-4 w-4" />
          Formula Guide
        </div>
        <h2 className="mt-3 text-3xl font-semibold">How the dashboard calculates results</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">
          These are deterministic classroom-level formulas. They explain aggregate patterns only and do not evaluate,
          diagnose, rank, or predict individual students.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {clusterDefinitions.map((item) => {
          const cluster = analytics.clusters.find((candidate) => candidate.label === item.label);
          return (
            <article key={item.label} className="metric-panel interactive-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{item.label}</h3>
                <span className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ background: item.color }}>
                  {item.range}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4f5954]">{item.body}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
                  <div className="text-xs uppercase tracking-normal text-[#6b746f]">Records</div>
                  <div className="mt-1 text-xl font-semibold">{cluster?.count ?? 0}</div>
                </div>
                <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
                  <div className="text-xs uppercase tracking-normal text-[#6b746f]">Average</div>
                  <div className="mt-1 text-xl font-semibold">{formatPercent(cluster?.average ?? 0)}</div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {formulas.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="metric-panel interactive-panel p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#dff1e8] text-[#0f5a55]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <code className="mt-2 block rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-sm text-[#27302c]">
                    {item.formula}
                  </code>
                  <p className="mt-3 text-sm leading-6 text-[#4f5954]">{item.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="metric-panel interactive-panel p-5">
        <h3 className="font-semibold">Current Dataset Snapshot</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormulaSnapshot label="Records" value={analytics.recordCount.toLocaleString()} />
          <FormulaSnapshot label="Average" value={formatPercent(analytics.overview.mean)} />
          <FormulaSnapshot label="Mastery" value={formatPercent(analytics.overview.masteryRate)} />
          <FormulaSnapshot label="Std dev" value={formatNumber(analytics.overview.standardDeviation)} />
          <FormulaSnapshot label="Trend" value={analytics.trend.direction.replace("_", " ")} />
        </div>
      </section>
    </section>
  );
}

function FormulaSnapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
