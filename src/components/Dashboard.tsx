"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileText, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { AiSummaryPanel } from "@/components/AiSummaryPanel";
import { ExportPanel } from "@/components/ExportPanel";
import { ExtraWorkspace } from "@/components/ExtraWorkspace";
import { FormulasWorkspace } from "@/components/FormulasWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import type { AnalyticsResult } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

const chartColors = ["#16726d", "#2f69a1", "#c65d21", "#b8860b", "#7a5aa6", "#b63f3f"];
const workspaceTabs = [
  { id: "overview", label: "Overview", activeClass: "bg-[#16726d] text-white" },
  { id: "extra", label: "Extra", activeClass: "bg-[#101418] text-white" },
  { id: "exports", label: "Exports", activeClass: "bg-[#c65d21] text-white" },
  { id: "formulas", label: "Formulas", activeClass: "bg-[#2f69a1] text-white" },
  { id: "architecture", label: "Architecture", activeClass: "bg-[#5a4f43] text-white" },
] as const;

export function Dashboard() {
  const { parsedCsv, analytics, normalized, reset, workspaceMode, setWorkspaceMode } = useAnalyticsStore();

  if (!analytics || !normalized || !parsedCsv) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-5 py-6 sm:px-7 lg:px-10">
      <div className="metric-panel interactive-panel reveal-up flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">Analytics dashboard</p>
          <h1 className="text-3xl font-semibold">{parsedCsv.fileName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone="success">{analytics.recordCount.toLocaleString()} normalized records</StatusBadge>
            <StatusBadge tone="info">{normalized.summary.scoreColumns} score column(s)</StatusBadge>
            {normalized.issues.length ? <StatusBadge tone="warning">{normalized.issues.length} skipped values</StatusBadge> : null}
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md"
          type="button"
          onClick={reset}
        >
          <RefreshCcw className="h-4 w-4" />
          New upload
        </button>
      </div>

      <div className="reveal-up overflow-x-auto rounded-lg border border-[#bec8c0] bg-white p-1 shadow-sm" style={{ animationDelay: "70ms" }}>
        <div className="flex min-w-max gap-1">
          {workspaceTabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "rounded px-4 py-2 text-sm font-semibold transition",
                workspaceMode === tab.id ? `active-workspace ${tab.activeClass}` : "text-[#3f4642] hover:bg-[#f1f4f1]",
              )}
              type="button"
              onClick={() => setWorkspaceMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div key={workspaceMode} className="workspace-view">
        {workspaceMode === "overview" ? <OverviewWorkspace analytics={analytics} /> : null}
        {workspaceMode === "extra" ? <ExtraWorkspace /> : null}
        {workspaceMode === "exports" ? <ExportsWorkspace /> : null}
        {workspaceMode === "formulas" ? <FormulasWorkspace analytics={analytics} /> : null}
        {workspaceMode === "architecture" ? <ArchitecturePanel /> : null}
      </div>
    </main>
  );
}

function OverviewWorkspace({ analytics }: { analytics: AnalyticsResult }) {
  return (
    <section className="workspace-page flex flex-col gap-5">
      <Overview analytics={analytics} />

      <TrendIntelligence analytics={analytics} />

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <CategoryPerformance analytics={analytics} />
        <MasteryBreakdown analytics={analytics} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ScoreDistribution analytics={analytics} />
        <TrendChart analytics={analytics} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SubjectComparison analytics={analytics} />
        <ClusterChart analytics={analytics} />
      </section>

      <CategoryHeatmap analytics={analytics} />

      <AiSummaryPanel />
    </section>
  );
}

function ExportsWorkspace() {
  return (
    <section className="workspace-page flex flex-col gap-5">
      <div className="metric-panel interactive-panel reveal-up overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[#9b4518]">Exports</p>
            <h2 className="mt-1 text-2xl font-semibold">Download local reports and datasets</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4f5954]">
              Exports replace backend persistence: download normalized records, deterministic analytics, AI summaries, and
              polished PDF reports without storing classroom data on a server.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {["Local", "Private", "Portable"].map((label) => (
              <div key={label} className="rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-3 text-sm font-semibold">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ExportPanel />
    </section>
  );
}

function TrendIntelligence({ analytics }: { analytics: AnalyticsResult }) {
  const overall = analytics.trendSignals.overall;
  const improving = analytics.trendSignals.improving.slice(0, 4);
  const declining = analytics.trendSignals.declining.slice(0, 4);
  const hasTrend = overall.direction !== "insufficient_data";
  const trendSections = [
    {
      key: "improving",
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Improving categories",
      items: improving,
      tone: "up" as const,
    },
    {
      key: "declining",
      icon: <TrendingDown className="h-4 w-4" />,
      title: "Declining categories",
      items: declining,
      tone: "down" as const,
    },
  ].filter((section) => section.items.length > 0);

  return (
    <section className="metric-panel interactive-panel reveal-up p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[#0f5a55]">Trend Intelligence</p>
          <h2 className="text-xl font-semibold">Past-to-present movement</h2>
        </div>
        <span className="text-sm text-[#5b635f]">
          {hasTrend ? `${overall.firstLabel} -> ${overall.latestLabel}` : "Needs at least two time or order segments"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">Overall movement</div>
              <div className="mt-2 text-3xl font-semibold">{hasTrend ? formatSignedChange(overall.change) : "No signal"}</div>
              <div className="mt-1 text-sm text-[#4f5954]">
                {hasTrend
                  ? `${formatPercent(overall.firstAverage)} earlier to ${formatPercent(overall.latestAverage)} latest`
                  : "Upload another dated or ordered dataset to compare movement."}
              </div>
            </div>
            <TrendBadge direction={overall.direction} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded bg-[#e6ebe5]">
            <div
              className="animated-bar h-2 rounded"
              style={{
                width: `${hasTrend ? Math.max(8, Math.min(100, Math.abs(overall.change) * 5 + 18)) : 8}%`,
                background: trendColor(overall.direction),
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#6b746f]">
            Trend movement compares the earliest available period against the latest. When dates are missing, the app uses
            upload-order segments and reports that limitation.
          </p>
        </div>

        {trendSections.length ? (
          <div className={cn("grid gap-4", trendSections.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1")}>
            {trendSections.map((section) => (
              <TrendList
                key={section.key}
                icon={section.icon}
                title={section.title}
                items={section.items}
                tone={section.tone}
              />
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-[#d9ded8] bg-white p-5 text-sm leading-6 text-[#6b746f]">
            No category improvement or decline trend yet. Add dated records, repeated assessments, or ordered uploads to
            unlock category-level movement.
          </div>
        )}
      </div>
    </section>
  );
}

function TrendBadge({ direction }: { direction: AnalyticsResult["trend"]["direction"] }) {
  return (
    <span
      className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-normal text-white"
      style={{ background: trendColor(direction) }}
    >
      {direction.replace("_", " ")}
    </span>
  );
}

function TrendList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: AnalyticsResult["trendSignals"]["byTopic"];
  tone: "up" | "down";
}) {
  return (
    <div className="rounded border border-[#d9ded8] p-4">
      <h3 className="mb-3 inline-flex items-center gap-2 font-semibold">
        <span className={tone === "up" ? "text-[#16726d]" : "text-[#b63f3f]"}>{icon}</span>
        {title}
      </h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded border border-[#e6ebe5] bg-white p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold">{item.label}</span>
              <span className={tone === "up" ? "font-semibold text-[#16726d]" : "font-semibold text-[#b63f3f]"}>
                {formatSignedChange(item.change)}
              </span>
            </div>
            <div className="mt-1 text-xs text-[#6b746f]">
              {formatPercent(item.firstAverage)} to {formatPercent(item.latestAverage)} | {item.points} points
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ analytics }: { analytics: AnalyticsResult }) {
  const metrics = [
    ["Average", formatPercent(analytics.overview.mean), analytics.overview.mean, "#16726d"],
    ["Median", formatPercent(analytics.overview.median), analytics.overview.median, "#2f69a1"],
    ["Std dev", formatNumber(analytics.overview.standardDeviation), 100 - analytics.overview.standardDeviation, "#c65d21"],
    ["Mastery", formatPercent(analytics.overview.masteryRate), analytics.overview.masteryRate, "#b8860b"],
    ["Consistency", formatPercent(analytics.overview.consistencyScore), analytics.overview.consistencyScore, "#7a5aa6"],
    [
      "Trend",
      analytics.trend.direction.replace("_", " "),
      analytics.trend.direction === "improving" ? 82 : analytics.trend.direction === "declining" ? 34 : 58,
      "#b63f3f",
    ],
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map(([label, value, progress, color], index) => (
        <div key={label} className="metric-panel interactive-panel reveal-up p-4" style={{ animationDelay: `${index * 55}ms` }}>
          <div className="text-xs font-semibold uppercase tracking-normal text-[#5b635f]">{label}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#e6ebe5]">
            <div
              className="animated-bar h-1.5 rounded"
              style={{
                width: `${Math.max(8, Math.min(100, Number(progress)))}%`,
                background: String(color),
                animationDelay: `${120 + index * 70}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

function formatSignedChange(value: number) {
  if (!Number.isFinite(value)) {
    return "0 pts";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)} pts`;
}

function trendColor(direction: AnalyticsResult["trend"]["direction"]) {
  if (direction === "improving") {
    return "#16726d";
  }

  if (direction === "declining") {
    return "#b63f3f";
  }

  if (direction === "flat") {
    return "#b8860b";
  }

  return "#6b746f";
}

function CategoryPerformance({ analytics }: { analytics: AnalyticsResult }) {
  const data = analytics.chartData.topicPerformance.slice(0, 12);

  return (
    <ChartShell title="Category Performance">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 18, right: 24, left: 18, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="topic" angle={-35} textAnchor="end" interval={0} height={76} tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Bar dataKey="average" name="Average" fill="#16726d" radius={[4, 4, 0, 0]} />
          <Bar dataKey="masteryRate" name="Mastery" fill="#2f69a1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function MasteryBreakdown({ analytics }: { analytics: AnalyticsResult }) {
  const data = analytics.masteryBreakdown;

  return (
    <ChartShell title="Mastery Breakdown">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 12, right: 18, bottom: 18, left: 18 }}>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={70} outerRadius={110} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ScoreDistribution({ analytics }: { analytics: AnalyticsResult }) {
  return (
    <ChartShell title="Score Distribution">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={analytics.chartData.distribution} margin={{ top: 16, right: 24, left: 18, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Records" fill="#c65d21" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function TrendChart({ analytics }: { analytics: AnalyticsResult }) {
  const hasData = analytics.chartData.trend.length > 1;

  return (
    <ChartShell title="Trend Over Time">
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.chartData.trend} margin={{ top: 16, right: 26, left: 18, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Line type="monotone" dataKey="average" name="Average" stroke="#2f69a1" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart icon={<FileText className="h-5 w-5" />} label="No date mapping" />
      )}
    </ChartShell>
  );
}

function SubjectComparison({ analytics }: { analytics: AnalyticsResult }) {
  const data = analytics.chartData.subjectComparison.slice(0, 10);

  return (
    <ChartShell title="Subject Comparisons">
      {data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 16, right: 24, left: 48, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <YAxis dataKey="subject" type="category" width={110} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="average" fill="#b8860b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart icon={<FileText className="h-5 w-5" />} label="No subject mapping" />
      )}
    </ChartShell>
  );
}

function ClusterChart({ analytics }: { analytics: AnalyticsResult }) {
  return (
    <ChartShell title="Performance Clusters">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={analytics.chartData.clusters} margin={{ top: 16, right: 24, left: 18, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Records" radius={[4, 4, 0, 0]}>
            {analytics.chartData.clusters.map((cluster, index) => (
              <Cell key={cluster.id} fill={chartColors[index % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function CategoryHeatmap({ analytics }: { analytics: AnalyticsResult }) {
  const topics = analytics.topicStats.slice(0, 24);

  return (
    <section className="metric-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Category Heatmap</h2>
        <span className="text-xs text-[#5b635f]">Average score</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {topics.map((topic) => (
          <div
            key={topic.topic}
            className="interactive-panel reveal-up rounded border border-[#d9ded8] p-3 text-sm transition hover:-translate-y-0.5"
            style={{ background: heatColor(topic.average) }}
          >
            <div className="truncate font-semibold">{topic.topic}</div>
            <div className="mt-2 text-xl font-semibold">{formatPercent(topic.average)}</div>
            <div className="mt-1 text-xs text-[#3f4642]">{topic.count} records</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="metric-panel interactive-panel reveal-up p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function EmptyChart({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-[#5b635f]">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function heatColor(value: number) {
  if (value >= 90) {
    return "#dff1e8";
  }

  if (value >= 80) {
    return "#e4edf5";
  }

  if (value >= 70) {
    return "#fff1c9";
  }

  if (value >= 60) {
    return "#f8e2cd";
  }

  return "#fae2de";
}
