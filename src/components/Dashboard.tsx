"use client";

import { useState } from "react";
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
import { FileText, Info, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { AiSummaryPanel } from "@/components/AiSummaryPanel";
import { ExportPanel } from "@/components/ExportPanel";
import { ExtraWorkspace } from "@/components/ExtraWorkspace";
import { FormulasWorkspace } from "@/components/FormulasWorkspace";
import { IndividualWorkspace } from "@/components/IndividualWorkspace";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusBadge } from "@/components/StatusBadge";
import { buildTimelineSeries, timelineTickFormatter, timelineTooltipLabel } from "@/lib/chartTimeline";
import { localizeDirection, localizeLabel, t, type Locale } from "@/lib/i18n";
import type { AnalyticsResult } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

const chartColors = ["#16726d", "#2f69a1", "#c65d21", "#b8860b", "#7a5aa6", "#b63f3f"];
const workspaceTabs = [
  { id: "overview", labelKey: "tabs.overview", activeClass: "bg-[#16726d] text-white" },
  { id: "individual", labelKey: "tabs.individual", activeClass: "bg-[#7a5aa6] text-white" },
  { id: "extra", labelKey: "tabs.extra", activeClass: "bg-[#101418] text-white" },
  { id: "exports", labelKey: "tabs.exports", activeClass: "bg-[#c65d21] text-white" },
  { id: "formulas", labelKey: "tabs.formulas", activeClass: "bg-[#2f69a1] text-white" },
  { id: "architecture", labelKey: "tabs.architecture", activeClass: "bg-[#5a4f43] text-white" },
] as const;

export function Dashboard() {
  const { locale, parsedCsv, analytics, normalized, reset, workspaceMode, setWorkspaceMode } = useAnalyticsStore();

  if (!analytics || !normalized || !parsedCsv) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-5 py-6 sm:px-7 lg:px-10">
      <div className="metric-panel interactive-panel reveal-up flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "dashboard.kicker")}</p>
          <h1 className="text-3xl font-semibold">{parsedCsv.fileName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone="success">
              {analytics.recordCount.toLocaleString()} {t(locale, "dashboard.normalizedRecords")}
            </StatusBadge>
            <StatusBadge tone="info">
              {normalized.summary.scoreColumns} {t(locale, "dashboard.scoreColumns")}
            </StatusBadge>
            {normalized.issues.length ? (
              <StatusBadge tone="warning">
                {normalized.issues.length} {t(locale, "dashboard.skippedValues")}
              </StatusBadge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <button
            className="inline-flex items-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md"
            type="button"
            onClick={reset}
          >
            <RefreshCcw className="h-4 w-4" />
            {t(locale, "common.newUpload")}
          </button>
        </div>
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
              {t(locale, tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div key={workspaceMode} className="workspace-view">
        {workspaceMode === "overview" ? <OverviewWorkspace analytics={analytics} /> : null}
        {workspaceMode === "individual" ? <IndividualWorkspace /> : null}
        {workspaceMode === "extra" ? <ExtraWorkspace /> : null}
        {workspaceMode === "exports" ? <ExportsWorkspace /> : null}
        {workspaceMode === "formulas" ? <FormulasWorkspace analytics={analytics} /> : null}
        {workspaceMode === "architecture" ? <ArchitecturePanel /> : null}
      </div>
    </main>
  );
}

function OverviewWorkspace({ analytics }: { analytics: AnalyticsResult }) {
  const { locale } = useAnalyticsStore();

  return (
    <section className="workspace-page flex flex-col gap-5">
      <Overview analytics={analytics} />

      <TrendIntelligence analytics={analytics} />

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <CategoryPerformance analytics={analytics} locale={locale} />
        <MasteryBreakdown analytics={analytics} locale={locale} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ScoreDistribution analytics={analytics} locale={locale} />
        <TrendChart analytics={analytics} locale={locale} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SubjectComparison analytics={analytics} locale={locale} />
        <ClusterChart analytics={analytics} locale={locale} />
      </section>

      <CategoryHeatmap analytics={analytics} locale={locale} />

      <AiSummaryPanel />
    </section>
  );
}

function ExportsWorkspace() {
  const { locale } = useAnalyticsStore();
  return (
    <section className="workspace-page flex flex-col gap-5">
      <div className="metric-panel interactive-panel reveal-up overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[#9b4518]">{t(locale, "exports.kicker")}</p>
            <h2 className="mt-1 text-2xl font-semibold">{t(locale, "exports.title")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4f5954]">
              {t(locale, "exports.body")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              locale === "mn" ? "Дотоод" : "Local",
              locale === "mn" ? "Нууцлалтай" : "Private",
              locale === "mn" ? "Зөөврийн" : "Portable",
            ].map((label) => (
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
  const { locale } = useAnalyticsStore();
  const overall = analytics.trendSignals.overall;
  const improving = analytics.trendSignals.improving.slice(0, 4);
  const declining = analytics.trendSignals.declining.slice(0, 4);
  const hasTrend = overall.direction !== "insufficient_data";
  const trendSections = [
    {
      key: "improving",
      icon: <TrendingUp className="h-4 w-4" />,
      title: t(locale, "trend.improvingCategories"),
      items: improving,
      tone: "up" as const,
    },
    {
      key: "declining",
      icon: <TrendingDown className="h-4 w-4" />,
      title: t(locale, "trend.decliningCategories"),
      items: declining,
      tone: "down" as const,
    },
  ].filter((section) => section.items.length > 0);

  return (
    <section className="metric-panel interactive-panel reveal-up p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "trend.kicker")}</p>
          <h2 className="text-xl font-semibold">{t(locale, "trend.title")}</h2>
        </div>
        <span className="text-sm text-[#5b635f]">
          {hasTrend
            ? `${localizeLabel(overall.firstLabel, locale)} -> ${localizeLabel(overall.latestLabel, locale)}`
            : t(locale, "trend.needData")}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">{t(locale, "trend.overall")}</div>
              <div className="mt-2 text-3xl font-semibold">{hasTrend ? formatSignedChange(overall.change) : t(locale, "trend.noSignal")}</div>
              <div className="mt-1 text-sm text-[#4f5954]">
                {hasTrend
                  ? `${formatPercent(overall.firstAverage)} ${t(locale, "trend.earlierToLatest")} ${formatPercent(overall.latestAverage)}`
                  : t(locale, "trend.uploadMore")}
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
            {t(locale, "trend.note")}
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
            {t(locale, "trend.empty")}
          </div>
        )}
      </div>
    </section>
  );
}

function TrendBadge({ direction }: { direction: AnalyticsResult["trend"]["direction"] }) {
  const { locale } = useAnalyticsStore();
  return (
    <span
      className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-normal text-white"
      style={{ background: trendColor(direction) }}
    >
      {localizeDirection(direction, locale)}
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
  const { locale } = useAnalyticsStore();
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
              <span className="truncate font-semibold">{localizeLabel(item.label, locale)}</span>
              <span className={tone === "up" ? "font-semibold text-[#16726d]" : "font-semibold text-[#b63f3f]"}>
                {formatSignedChange(item.change)}
              </span>
            </div>
            <div className="mt-1 text-xs text-[#6b746f]">
              {formatPercent(item.firstAverage)} {locale === "mn" ? "-с" : "to"} {formatPercent(item.latestAverage)} |{" "}
              {item.points} {locale === "mn" ? "цэг" : "points"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ analytics }: { analytics: AnalyticsResult }) {
  const { locale } = useAnalyticsStore();
  const metrics = [
    [t(locale, "overview.average"), formatPercent(analytics.overview.mean), analytics.overview.mean, "#16726d"],
    [t(locale, "overview.median"), formatPercent(analytics.overview.median), analytics.overview.median, "#2f69a1"],
    [t(locale, "common.stdDev"), formatNumber(analytics.overview.standardDeviation), 100 - analytics.overview.standardDeviation, "#c65d21"],
    [t(locale, "overview.mastery"), formatPercent(analytics.overview.masteryRate), analytics.overview.masteryRate, "#b8860b"],
    [t(locale, "overview.consistency"), formatPercent(analytics.overview.consistencyScore), analytics.overview.consistencyScore, "#7a5aa6"],
    [
      t(locale, "common.trend"),
      localizeDirection(analytics.trend.direction, locale),
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

function CategoryPerformance({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const data = analytics.chartData.topicPerformance.slice(0, 12).map((item) => ({
    ...item,
    topic: localizeLabel(item.topic, locale),
  }));

  return (
    <ChartShell title={t(locale, "overview.categoryPerformance")} explanation={t(locale, "chart.categoryPerformance.explain")}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 18, right: 24, left: 18, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="topic" angle={-35} textAnchor="end" interval={0} height={76} tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Bar dataKey="average" name={t(locale, "common.average")} fill="#16726d" radius={[4, 4, 0, 0]} />
          <Bar dataKey="masteryRate" name={t(locale, "common.mastery")} fill="#2f69a1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function MasteryBreakdown({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const data = analytics.masteryBreakdown.map((item) => ({ ...item, label: localizeLabel(item.label, locale) }));

  return (
    <ChartShell title={t(locale, "overview.masteryBreakdown")} explanation={t(locale, "chart.masteryBreakdown.explain")}>
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

function ScoreDistribution({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  return (
    <ChartShell title={t(locale, "overview.scoreDistribution")} explanation={t(locale, "chart.scoreDistribution.explain")}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={analytics.chartData.distribution} margin={{ top: 16, right: 24, left: 18, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name={t(locale, "common.records")} fill="#c65d21" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function TrendChart({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const hasData = analytics.chartData.trend.length > 1;
  const trendData = buildTimelineSeries(analytics.chartData.trend, (point) => point.date, locale);

  return (
    <ChartShell title={t(locale, "overview.trendOverTime")} explanation={t(locale, "chart.trendOverTime.explain")}>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData.data} margin={{ top: 16, right: 26, left: 18, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
            <XAxis
              dataKey="timelineValue"
              type={trendData.useTimeScale ? "number" : "category"}
              scale={trendData.useTimeScale ? "time" : undefined}
              domain={trendData.useTimeScale ? ["dataMin", "dataMax"] : undefined}
              tick={{ fontSize: 11 }}
              tickFormatter={trendData.useTimeScale ? timelineTickFormatter(locale) : undefined}
            />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => `${value}%`} labelFormatter={trendData.useTimeScale ? timelineTooltipLabel(locale) : undefined} />
            <Line type="linear" dataKey="average" name={t(locale, "common.average")} stroke="#2f69a1" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart icon={<FileText className="h-5 w-5" />} label={t(locale, "overview.noDateMapping")} />
      )}
    </ChartShell>
  );
}

function SubjectComparison({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const data = analytics.chartData.subjectComparison.slice(0, 10).map((item) => ({
    ...item,
    subject: localizeLabel(item.subject, locale),
  }));

  return (
    <ChartShell title={t(locale, "overview.subjectComparisons")} explanation={t(locale, "chart.subjectComparisons.explain")}>
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
        <EmptyChart icon={<FileText className="h-5 w-5" />} label={t(locale, "overview.noSubjectMapping")} />
      )}
    </ChartShell>
  );
}

function ClusterChart({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const data = analytics.chartData.clusters.map((cluster) => ({ ...cluster, label: localizeLabel(cluster.label, locale) }));

  return (
    <ChartShell title={t(locale, "overview.performanceClusters")} explanation={t(locale, "chart.performanceClusters.explain")}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 16, right: 24, left: 18, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name={t(locale, "common.records")} radius={[4, 4, 0, 0]}>
            {data.map((cluster, index) => (
              <Cell key={cluster.id} fill={chartColors[index % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function CategoryHeatmap({ analytics, locale }: { analytics: AnalyticsResult; locale: Locale }) {
  const topics = analytics.topicStats.slice(0, 24);

  return (
    <ChartShell
      title={t(locale, "overview.categoryHeatmap")}
      explanation={t(locale, "chart.categoryHeatmap.explain")}
      meta={<span>{t(locale, "overview.averageScore")}</span>}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {topics.map((topic) => (
          <div
            key={topic.topic}
            className="interactive-panel reveal-up rounded border border-[#d9ded8] p-3 text-sm transition hover:-translate-y-0.5"
            style={{ background: heatColor(topic.average) }}
          >
            <div className="truncate font-semibold">{localizeLabel(topic.topic, locale)}</div>
            <div className="mt-2 text-xl font-semibold">{formatPercent(topic.average)}</div>
            <div className="mt-1 text-xs text-[#3f4642]">
              {topic.count} {locale === "en" ? t(locale, "common.records").toLowerCase() : t(locale, "common.records")}
            </div>
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function ChartShell({
  title,
  explanation,
  meta,
  children,
}: {
  title: string;
  explanation: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { locale } = useAnalyticsStore();
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <section className="metric-panel interactive-panel reveal-up p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          {meta ? <div className="mt-1 text-xs text-[#5b635f]">{meta}</div> : null}
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3f4642] transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-sm"
          type="button"
          aria-expanded={showExplanation}
          onClick={() => setShowExplanation((current) => !current)}
        >
          <Info className="h-3.5 w-3.5 text-[#16726d]" />
          {t(locale, showExplanation ? "charts.hideExplanation" : "charts.explain")}
        </button>
      </div>
      {showExplanation ? (
        <div
          className="mb-4 rounded border border-[#cdd8d0] bg-[#f7faf7] p-4 text-sm leading-6 text-[#3f4642]"
        >
          {explanation}
        </div>
      ) : null}
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
