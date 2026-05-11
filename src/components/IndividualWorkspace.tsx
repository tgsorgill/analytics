"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Filter, Search, ShieldCheck, UserRound } from "lucide-react";
import { exportStudentCoveragePdf } from "@/lib/exporters";
import { buildTimelineSeries, timelineTickFormatter, timelineTooltipLabel } from "@/lib/chartTimeline";
import { localizeDirection, localizeLabel, t, type Locale } from "@/lib/i18n";
import { scoreToPercent } from "@/lib/score";
import type { NormalizedRecord, TrendDirection } from "@/lib/types";
import { cn, downloadJson, formatNumber, formatPercent, round, safeFilename } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

type StudentTrend = {
  direction: TrendDirection;
  change: number;
  firstAverage: number;
  latestAverage: number;
  points: { label: string; average: number; count: number }[];
};

type StudentStats = {
  key: string;
  label: string;
  secondaryLabel: string;
  records: NormalizedRecord[];
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  masteryRate: number;
  consistencyScore: number;
  standardDeviation: number;
  efficiency: EfficiencyProfile;
  trend: StudentTrend;
  strongest: GroupStat[];
  weakest: GroupStat[];
  coverage: GroupStat[];
  subjects: GroupStat[];
  distribution: { label: string; count: number }[];
};

type StudentStatsBase = Omit<StudentStats, "efficiency">;
type StudentSort =
  | "name_asc"
  | "grade_desc"
  | "grade_asc"
  | "efficiency_desc"
  | "improvement_desc"
  | "consistency_desc"
  | "records_desc";

type EfficiencyTier = "Elite" | "Strong" | "Steady" | "Developing";

type EfficiencyProfile = {
  score: number;
  tier: EfficiencyTier;
  components: {
    scoring: number;
    mastery: number;
    consistency: number;
    momentum: number;
    coverage: number;
  };
};

type GroupStat = {
  label: string;
  count: number;
  average: number;
  masteryRate: number;
};

const chartColors = ["#16726d", "#2f69a1", "#c65d21", "#b8860b", "#7a5aa6", "#b63f3f"];
const emptyRecords: NormalizedRecord[] = [];

export function IndividualWorkspace() {
  const { locale, normalized } = useAnalyticsStore();
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("all");
  const [trend, setTrend] = useState("all");
  const [sortBy, setSortBy] = useState<StudentSort>("name_asc");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const records = normalized?.records ?? emptyRecords;
  const students = useMemo(() => buildStudentStats(records), [records]);
  const filteredStudents = useMemo(
    () => sortStudents(filterStudents(students, { query, band, trend }), sortBy),
    [band, query, sortBy, students, trend],
  );
  const selected = filteredStudents.find((student) => student.key === selectedKey) ?? filteredStudents[0] ?? students[0];

  if (!students.length) {
    return (
      <section className="workspace-page reveal-up flex flex-col gap-5">
        <div className="metric-panel interactive-panel p-6">
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
            <UserRound className="h-4 w-4" />
            {t(locale, "individual.kicker")}
          </div>
          <h2 className="mt-3 text-3xl font-semibold">{t(locale, "individual.emptyTitle")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">{t(locale, "individual.emptyBody")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page reveal-up flex flex-col gap-5">
      <div className="metric-panel interactive-panel min-w-0 overflow-hidden">
        <div className="grid min-w-0 gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] xl:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
              <UserRound className="h-4 w-4" />
              {t(locale, "individual.kicker")}
            </div>
            <h2 className="mt-2 text-3xl font-semibold">{t(locale, "individual.title")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">{t(locale, "individual.body")}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-xs font-semibold text-[#4f5954]">
              <ShieldCheck className="h-4 w-4 text-[#16726d]" />
              {t(locale, "individual.safety")}
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <HeroStat label={t(locale, "individual.students")} value={students.length.toLocaleString()} />
            <HeroStat label={t(locale, "common.records")} value={records.length.toLocaleString()} />
            <HeroStat label={t(locale, "individual.filtered")} value={filteredStudents.length.toLocaleString()} />
          </div>
        </div>
      </div>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:items-start">
        <aside className="metric-panel interactive-panel flex min-h-[520px] min-w-0 flex-col overflow-hidden p-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:max-h-[calc(100vh-3rem)]">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Filter className="h-4 w-4 text-[#16726d]" />
            {t(locale, "individual.find")}
          </div>
          <div className="grid min-w-0 gap-3">
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">{t(locale, "individual.search")}</span>
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b746f]" />
                <input
                  className="w-full min-w-0 rounded border border-[#bec8c0] bg-white py-2 pl-9 pr-3"
                  value={query}
                  placeholder={t(locale, "individual.searchPlaceholder")}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </label>

            <FilterSelect
              label={t(locale, "individual.sort")}
              value={sortBy}
              onChange={(value) => setSortBy(value as StudentSort)}
              options={sortOptions()}
              locale={locale}
            />
            <FilterSelect label={t(locale, "individual.performanceBand")} value={band} onChange={setBand} options={performanceBandOptions()} locale={locale} />
            <FilterSelect label={t(locale, "individual.trendFilter")} value={trend} onChange={setTrend} options={trendOptions()} locale={locale} />
          </div>

          <div className="scrollbar-stable mt-4 min-h-[220px] flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div className="grid min-w-0 gap-2">
              {filteredStudents.map((student) => (
                <button
                  key={student.key}
                  className={cn(
                    "w-full min-w-0 overflow-hidden rounded border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                    selected?.key === student.key ? "border-[#16726d] bg-[#eef8f5]" : "border-[#d9ded8] bg-white hover:bg-[#f7faf7]",
                  )}
                  type="button"
                  onClick={() => setSelectedKey(student.key)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{student.label}</div>
                      <div className="mt-1 truncate text-xs text-[#6b746f]">{student.secondaryLabel}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded bg-[#e4edf5] px-2 py-1 text-xs font-semibold text-[#254f78]">
                        {formatPercent(student.average)}
                      </span>
                      <span className="rounded bg-[#f3ead1] px-2 py-1 text-xs font-semibold text-[#835f05]">
                        EFF {formatNumber(student.efficiency.score, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs text-[#6b746f]">
                    <span className="min-w-0 truncate">
                      {student.count} {locale === "mn" ? "рекорд" : "records"}
                    </span>
                    <span className={cn("max-w-[52%] shrink-0 truncate text-right", student.trend.direction === "declining" ? "text-[#b63f3f]" : "text-[#16726d]")}>
                      {localizeDirection(student.trend.direction, locale)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selected ? <StudentDetail student={selected} locale={locale} /> : null}
      </section>
    </section>
  );
}

function StudentDetail({ student, locale }: { student: StudentStats; locale: Locale }) {
  const { parsedCsv } = useAnalyticsStore();
  const sourceName = parsedCsv?.fileName ?? "student-coverage";
  const progressionSeries = buildTimelineSeries(student.trend.points, (point) => point.label, locale);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="metric-panel interactive-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "individual.profile")}</p>
            <h3 className="mt-1 break-words text-3xl font-semibold">{student.label}</h3>
            <p className="mt-1 break-words text-sm text-[#5b635f]">{student.secondaryLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded border border-[#16726d] bg-[#16726d] px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#0f5a55] hover:shadow-md"
              type="button"
              aria-label={locale === "mn" ? "Сурагчийн детерминист хамралтын PDF татах" : "Export student-level deterministic coverage PDF"}
              onClick={() => void exportStudentCoveragePdf(sourceName, student, locale)}
            >
              <FileText className="h-4 w-4" />
              {locale === "mn" ? "PDF тайлан татах" : "Export PDF report"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-2 text-sm font-semibold text-[#26302b] transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md"
              type="button"
              aria-label={locale === "mn" ? "Сурагчийн детерминист хамралтын JSON татах" : "Export student-level deterministic coverage JSON"}
              onClick={() => exportStudentCoverage(sourceName, student, locale)}
            >
              <Download className="h-4 w-4 text-[#16726d]" />
              {locale === "mn" ? "Хамралтын JSON татах" : "Export coverage JSON"}
            </button>
            <span className="w-fit max-w-full rounded px-3 py-2 text-sm font-semibold text-white" style={{ background: trendColor(student.trend.direction) }}>
              {localizeDirection(student.trend.direction, locale)} | {formatSignedChange(student.trend.change)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
          <MetricCard label={t(locale, "individual.efficiency")} value={formatNumber(student.efficiency.score, 1)} progress={student.efficiency.score} color="#835f05" />
          <MetricCard label={t(locale, "common.average")} value={formatPercent(student.average)} progress={student.average} color="#16726d" />
          <MetricCard label={t(locale, "overview.median")} value={formatPercent(student.median)} progress={student.median} color="#2f69a1" />
          <MetricCard label={t(locale, "common.mastery")} value={formatPercent(student.masteryRate)} progress={student.masteryRate} color="#b8860b" />
          <MetricCard label={t(locale, "overview.consistency")} value={formatPercent(student.consistencyScore)} progress={student.consistencyScore} color="#7a5aa6" />
          <MetricCard label={t(locale, "individual.lowHigh")} value={`${formatPercent(student.min)} / ${formatPercent(student.max)}`} progress={student.max} color="#c65d21" />
          <MetricCard label={t(locale, "common.records")} value={student.count.toLocaleString()} progress={Math.min(100, student.count * 8)} color="#b63f3f" />
        </div>
      </section>

      <EfficiencyPanel student={student} locale={locale} />

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ChartPanel title={t(locale, "individual.progression")}>
          {student.trend.points.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={progressionSeries.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
                <XAxis
                  dataKey="timelineValue"
                  type={progressionSeries.useTimeScale ? "number" : "category"}
                  scale={progressionSeries.useTimeScale ? "time" : undefined}
                  domain={progressionSeries.useTimeScale ? ["dataMin", "dataMax"] : undefined}
                  tick={{ fontSize: 11 }}
                  tickFormatter={progressionSeries.useTimeScale ? timelineTickFormatter(locale) : undefined}
                />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} labelFormatter={progressionSeries.useTimeScale ? timelineTooltipLabel(locale) : undefined} />
                <Line type="linear" dataKey="average" name={t(locale, "common.average")} stroke="#16726d" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text={t(locale, "individual.noTrend")} />
          )}
        </ChartPanel>

        <ChartPanel title={t(locale, "individual.distribution")}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={student.distribution} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name={t(locale, "common.records")} radius={[4, 4, 0, 0]}>
                {student.distribution.map((entry, index) => (
                  <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        <GroupList title={t(locale, "individual.strongest")} items={student.strongest} locale={locale} tone="strong" />
        <GroupList title={t(locale, "individual.watch")} items={student.weakest} locale={locale} tone="watch" />
        <GroupList title={t(locale, "individual.coverage")} items={student.coverage} locale={locale} tone="coverage" />
      </section>

      <section className="metric-panel interactive-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">{t(locale, "individual.recentRecords")}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#d9ded8] bg-[#f1f4f1] text-xs uppercase tracking-normal text-[#4f5954]">
              <tr>
                <th className="px-3 py-2">{t(locale, "individual.date")}</th>
                <th className="px-3 py-2">{t(locale, "individual.category")}</th>
                <th className="px-3 py-2">{t(locale, "individual.assessment")}</th>
                <th className="px-3 py-2">{t(locale, "common.trend")}</th>
                <th className="px-3 py-2">{t(locale, "individual.score")}</th>
              </tr>
            </thead>
            <tbody>
              {student.records.slice(-12).reverse().map((record, index) => (
                <tr key={`${student.key}-${index}-${record.score}`} className="border-b border-[#eef1ed] last:border-b-0">
                  <td className="px-3 py-2 text-[#5b635f]">{record.date ?? "—"}</td>
                  <td className="px-3 py-2">{localizeLabel(recordCategory(record), locale)}</td>
                  <td className="px-3 py-2">{localizeLabel(record.assessment ?? record.metricName ?? "—", locale)}</td>
                  <td className="px-3 py-2">{localizeLabel(record.subject ?? record.term ?? "—", locale)}</td>
                  <td className="px-3 py-2 font-semibold">{formatPercent(scoreToPercent(record.score, record.maxScore))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-4">
      <div className="truncate text-xs font-semibold uppercase tracking-normal text-[#6b746f]" title={label}>
        {label}
      </div>
      <div className="mt-2 truncate text-2xl font-semibold" title={value}>
        {value}
      </div>
    </div>
  );
}

function MetricCard({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
      <div className="truncate text-xs font-semibold uppercase tracking-normal text-[#6b746f]" title={label}>
        {label}
      </div>
      <div className="mt-2 truncate text-xl font-semibold" title={value}>
        {value}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#e6ebe5]">
        <div className="animated-bar h-1.5 rounded" style={{ width: `${Math.max(8, Math.min(100, progress))}%`, background: color }} />
      </div>
    </div>
  );
}

function EfficiencyPanel({ student, locale }: { student: StudentStats; locale: Locale }) {
  const components = [
    [t(locale, "individual.scoringImpact"), student.efficiency.components.scoring, "#16726d"],
    [t(locale, "individual.masteryImpact"), student.efficiency.components.mastery, "#b8860b"],
    [t(locale, "individual.consistencyImpact"), student.efficiency.components.consistency, "#7a5aa6"],
    [t(locale, "individual.momentumImpact"), student.efficiency.components.momentum, trendColor(student.trend.direction)],
    [t(locale, "individual.coverageImpact"), student.efficiency.components.coverage, "#2f69a1"],
  ] as const;

  return (
    <section className="metric-panel interactive-panel min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(220px,0.4fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-[#835f05]">{t(locale, "individual.efficiencyBand")}</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-semibold">{formatNumber(student.efficiency.score, 1)}</span>
            <span className="mb-1 rounded bg-[#f3ead1] px-3 py-1 text-sm font-semibold text-[#835f05]">
              {localizeEfficiencyTier(student.efficiency.tier, locale)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4f5954]">{t(locale, "individual.efficiencyBody")}</p>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-5">
          {components.map(([label, value, color]) => (
            <div key={label} className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
              <div className="truncate text-xs font-semibold uppercase tracking-normal text-[#6b746f]" title={label}>
                {label}
              </div>
              <div className="mt-2 text-lg font-semibold">{formatPercent(value)}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#e6ebe5]">
                <div className="animated-bar h-1.5 rounded" style={{ width: `${Math.max(8, Math.min(100, value))}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="metric-panel interactive-panel min-w-0 overflow-hidden p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function GroupList({ title, items, locale, tone }: { title: string; items: GroupStat[]; locale: Locale; tone: "strong" | "watch" | "coverage" }) {
  const color = tone === "strong" ? "#16726d" : tone === "watch" ? "#b63f3f" : "#2f69a1";

  return (
    <section className="metric-panel interactive-panel min-w-0 overflow-hidden p-5">
      <h3 className="mb-4 truncate text-lg font-semibold" title={title}>
        {title}
      </h3>
      {items.length ? (
        <div className="grid min-w-0 gap-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-white p-3">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="min-w-0 truncate font-semibold" title={localizeLabel(item.label, locale)}>
                  {localizeLabel(item.label, locale)}
                </span>
                <span className="shrink-0 text-sm font-semibold" style={{ color }}>
                  {formatPercent(item.average)}
                </span>
              </div>
              <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs text-[#6b746f]">
                <span className="min-w-0 truncate">
                  {item.count} {locale === "mn" ? "рекорд" : "records"}
                </span>
                <span className="shrink-0 text-right">
                  {t(locale, "common.mastery")} {formatPercent(item.masteryRate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={t(locale, "common.nothing")} />
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded border border-dashed border-[#d9ded8] bg-[#f7faf7] p-5 text-center text-sm text-[#6b746f]">
      {text}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  locale,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  locale: Locale;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="truncate font-medium" title={label}>
        {label}
      </span>
      <select className="w-full min-w-0 rounded border border-[#bec8c0] bg-white px-2 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {filterOptionLabel(option, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}

function exportStudentCoverage(fileName: string, student: StudentStats, locale: Locale) {
  downloadJson(`${safeFilename(fileName)}-${safeFilename(student.label, "student")}-individual-coverage.json`, {
    exportedAt: new Date().toISOString(),
    privacy:
      locale === "mn"
        ? "Энэ экспорт нь багшийн браузер дотор үүссэн. AI хувь сурагчийн шинжилгээ хийгээгүй."
        : "This export was created locally in the teacher's browser. No AI individual analysis was performed.",
    workspace: locale === "mn" ? "Хувь хүн" : "Individual",
    student: {
      key: student.key,
      label: student.label,
      secondaryLabel: student.secondaryLabel,
      recordCount: student.count,
    },
    deterministicStats: {
      average: student.average,
      median: student.median,
      min: student.min,
      max: student.max,
      masteryRate: student.masteryRate,
      consistencyScore: student.consistencyScore,
      standardDeviation: student.standardDeviation,
      efficiency: student.efficiency,
      trend: student.trend,
      strongest: student.strongest,
      watchAreas: student.weakest,
      coverage: student.coverage,
      subjects: student.subjects,
      distribution: student.distribution,
    },
    records: student.records,
  });
}

function buildStudentStats(records: NormalizedRecord[]): StudentStats[] {
  const groups = new Map<string, NormalizedRecord[]>();

  for (const record of records) {
    const key = studentKey(record);
    if (!key) {
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const baseStudents = Array.from(groups.entries())
    .map(([key, groupRecords]) => {
      const values = groupRecords.map((record) => scoreToPercent(record.score, record.maxScore)).filter(Number.isFinite);
      const average = round(mean(values), 2);
      const secondaryLabel = secondaryStudentLabel(groupRecords[0]);
      const coverage = groupedStats(groupRecords, recordCategory).sort((a, b) => b.count - a.count);

      return {
        key,
        label: displayStudentLabel(groupRecords[0]),
        secondaryLabel,
        records: groupRecords,
        count: values.length,
        average,
        median: round(median(values), 2),
        min: values.length ? round(Math.min(...values), 2) : 0,
        max: values.length ? round(Math.max(...values), 2) : 0,
        masteryRate: masteryRate(values),
        consistencyScore: round(Math.max(0, Math.min(100, 100 - standardDeviation(values))), 1),
        standardDeviation: round(standardDeviation(values), 2),
        trend: buildTrend(groupRecords),
        strongest: [...coverage].sort((a, b) => b.average - a.average).slice(0, 4),
        weakest: [...coverage].sort((a, b) => a.average - b.average).slice(0, 4),
        coverage: coverage.slice(0, 6),
        subjects: groupedStats(groupRecords, recordSubject).sort((a, b) => b.count - a.count),
        distribution: buildDistribution(values),
      } satisfies StudentStatsBase;
    });
  const maxCount = Math.max(1, ...baseStudents.map((student) => student.count));

  return baseStudents
    .map((student) => ({
      ...student,
      efficiency: buildEfficiency(student, maxCount),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function filterStudents(
  students: StudentStats[],
  filters: { query: string; band: string; trend: string },
) {
  const query = filters.query.trim().toLowerCase();

  return students.filter((student) => {
    const matchesSearch =
      !query ||
      student.label.toLowerCase().includes(query) ||
      student.secondaryLabel.toLowerCase().includes(query);
    const matchesBand = filters.band === "all" || bandForAverage(student.average) === filters.band;
    const matchesTrend = filters.trend === "all" || student.trend.direction === filters.trend;
    return matchesSearch && matchesBand && matchesTrend;
  });
}

function sortStudents(students: StudentStats[], sortBy: StudentSort) {
  const sorted = [...students];

  if (sortBy === "grade_desc") {
    return sorted.sort((a, b) => b.average - a.average || a.label.localeCompare(b.label));
  }

  if (sortBy === "grade_asc") {
    return sorted.sort((a, b) => a.average - b.average || a.label.localeCompare(b.label));
  }

  if (sortBy === "efficiency_desc") {
    return sorted.sort((a, b) => b.efficiency.score - a.efficiency.score || a.label.localeCompare(b.label));
  }

  if (sortBy === "improvement_desc") {
    return sorted.sort((a, b) => b.trend.change - a.trend.change || b.average - a.average || a.label.localeCompare(b.label));
  }

  if (sortBy === "consistency_desc") {
    return sorted.sort((a, b) => b.consistencyScore - a.consistencyScore || b.average - a.average || a.label.localeCompare(b.label));
  }

  if (sortBy === "records_desc") {
    return sorted.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  return sorted.sort((a, b) => a.label.localeCompare(b.label));
}

function buildEfficiency(student: StudentStatsBase, maxCount: number): EfficiencyProfile {
  const momentum =
    student.trend.direction === "insufficient_data"
      ? 50
      : clamp(50 + student.trend.change * 2.2, 0, 100);
  const coverage = clamp((student.count / maxCount) * 100, 0, 100);
  const score = round(
    student.average * 0.44 +
      student.masteryRate * 0.2 +
      student.consistencyScore * 0.18 +
      momentum * 0.12 +
      coverage * 0.06,
    1,
  );

  return {
    score,
    tier: efficiencyTier(score),
    components: {
      scoring: round(student.average, 1),
      mastery: round(student.masteryRate, 1),
      consistency: round(student.consistencyScore, 1),
      momentum: round(momentum, 1),
      coverage: round(coverage, 1),
    },
  };
}

function groupedStats(records: NormalizedRecord[], labeler: (record: NormalizedRecord) => string) {
  const groups = new Map<string, number[]>();

  for (const record of records) {
    const label = labeler(record);
    const value = scoreToPercent(record.score, record.maxScore);
    if (!Number.isFinite(value)) {
      continue;
    }
    groups.set(label, [...(groups.get(label) ?? []), value]);
  }

  return Array.from(groups.entries()).map(([label, values]) => ({
    label,
    count: values.length,
    average: round(mean(values), 2),
    masteryRate: masteryRate(values),
  }));
}

function buildTrend(records: NormalizedRecord[]): StudentTrend {
  const groups = chronologicalGroups(records);
  const points = groups.map(([label, values]) => ({
    label,
    average: round(mean(values), 2),
    count: values.length,
  }));

  if (points.length < 2) {
    return {
      direction: "insufficient_data",
      change: 0,
      firstAverage: 0,
      latestAverage: 0,
      points,
    };
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const change = round(latest.average - first.average, 1);
  const slope = linearSlope(points.map((point, index) => [index, point.average]));
  return {
    direction: change >= 1.5 || (slope >= 0.45 && change > 0) ? "improving" : change <= -1.5 || (slope <= -0.45 && change < 0) ? "declining" : "flat",
    change,
    firstAverage: first.average,
    latestAverage: latest.average,
    points,
  };
}

function chronologicalGroups(records: NormalizedRecord[]): [string, number[]][] {
  const dated = new Map<string, number[]>();
  for (const record of records) {
    if (!record.date) {
      continue;
    }
    const value = scoreToPercent(record.score, record.maxScore);
    if (Number.isFinite(value)) {
      dated.set(record.date, [...(dated.get(record.date) ?? []), value]);
    }
  }

  if (dated.size >= 2) {
    return Array.from(dated.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  const progressionGroups = progressionGroupsFromLabels(records);
  if (progressionGroups.length >= 2) {
    return progressionGroups;
  }

  const values = records.map((record) => scoreToPercent(record.score, record.maxScore)).filter(Number.isFinite);
  if (values.length < 2) {
    return [];
  }

  const bucketCount = Math.min(6, Math.max(2, Math.ceil(values.length / 5)));
  const bucketSize = Math.ceil(values.length / bucketCount);
  const buckets = new Map<string, number[]>();
  values.forEach((value, index) => {
    const bucket = Math.floor(index / bucketSize);
    const label = bucketCount === 2 ? (bucket === 0 ? "Earlier records" : "Later records") : `Segment ${bucket + 1}`;
    buckets.set(label, [...(buckets.get(label) ?? []), value]);
  });

  return Array.from(buckets.entries());
}

function progressionGroupsFromLabels(records: NormalizedRecord[]): [string, number[]][] {
  const groups = new Map<string, number[]>();
  const orderedLabels: string[] = [];

  for (const record of records) {
    const label = progressionLabel(record);
    const value = scoreToPercent(record.score, record.maxScore);
    if (!label || !Number.isFinite(value)) {
      continue;
    }

    if (!groups.has(label)) {
      orderedLabels.push(label);
    }
    groups.set(label, [...(groups.get(label) ?? []), value]);
  }

  if (!hasOrderedProgressionLabels(orderedLabels)) {
    return [];
  }

  return orderedLabels.map((label) => [label, groups.get(label) ?? []]);
}

function progressionLabel(record: NormalizedRecord) {
  const label = record.assessment?.trim() || record.metricName?.trim() || record.term?.trim();
  if (label && label !== record.studentName?.trim() && label !== record.studentId?.trim()) {
    return label;
  }

  const topic = record.topic?.trim();
  return topic && topic !== record.studentName?.trim() && topic !== record.studentId?.trim() && isProgressionLikeLabel(topic) ? topic : undefined;
}

function hasOrderedProgressionLabels(labels: string[]) {
  const uniqueLabels = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
  if (uniqueLabels.length < 2) {
    return false;
  }

  const progressionLikeCount = uniqueLabels.filter(isProgressionLikeLabel).length;
  const orderedNumberCount = uniqueLabels.filter((label) => extractOrderNumber(label) !== null).length;
  const hasPrePostPair = uniqueLabels.some((label) => /\bpre\b|өмнөх|эхний/i.test(label)) && uniqueLabels.some((label) => /\bpost\b|\bfinal\b|дараах|сүүлийн|эцсийн/i.test(label));
  return progressionLikeCount >= 2 || orderedNumberCount >= 2 || hasPrePostPair;
}

function isProgressionLikeLabel(label: string) {
  const normalized = label.toLowerCase();
  const hasSequenceNumber = extractOrderNumber(normalized) !== null;
  const hasProgressionWord =
    /\b(quiz|test|exam|assessment|assignment|homework|week|unit|lesson|module|segment|part|section|term|semester|quarter|checkpoint|attempt|cycle|round)\b/i.test(normalized) ||
    /(сорил|шалгалт|үнэлгээ|даалгавар|долоо хоног|хэсэг|нэгж|сэдэв|улирал|оролдлого|шат|модуль)/i.test(normalized);
  const hasTemporalWord = /\b(pre|post|baseline|midterm|final|early|later|latest)\b/i.test(normalized) || /(өмнөх|дараах|эхний|сүүлийн|эцсийн|дундын)/i.test(normalized);
  return (hasSequenceNumber && hasProgressionWord) || hasTemporalWord;
}

function extractOrderNumber(label: string) {
  const match = label.match(/(?:^|[^\d])(\d{1,4})(?:[^\d]|$)/);
  return match ? Number(match[1]) : null;
}

function buildDistribution(values: number[]) {
  const bins = [
    { label: "0-59", min: 0, max: 59, count: 0 },
    { label: "60-69", min: 60, max: 69, count: 0 },
    { label: "70-79", min: 70, max: 79, count: 0 },
    { label: "80-89", min: 80, max: 89, count: 0 },
    { label: "90-100", min: 90, max: 100, count: 0 },
  ];

  for (const value of values) {
    const bounded = Math.max(0, Math.min(100, value));
    const bin = bins.find((candidate) => bounded >= candidate.min && bounded <= candidate.max) ?? bins[bins.length - 1];
    bin.count += 1;
  }

  return bins.map(({ label, count }) => ({ label, count }));
}

function performanceBandOptions() {
  return ["all", "Needs support", "Approaching", "Proficient", "Advanced"];
}

function trendOptions() {
  return ["all", "improving", "declining", "flat", "insufficient_data"];
}

function sortOptions(): StudentSort[] {
  return ["name_asc", "grade_desc", "grade_asc", "efficiency_desc", "improvement_desc", "consistency_desc", "records_desc"];
}

function filterOptionLabel(option: string, locale: Locale) {
  if (option === "all") {
    return t(locale, "individual.all");
  }

  const sortLabel = sortOptionLabel(option as StudentSort, locale);
  if (sortLabel) {
    return sortLabel;
  }

  if (["improving", "declining", "flat", "insufficient_data"].includes(option)) {
    return localizeDirection(option, locale);
  }

  return localizeLabel(option, locale);
}

function sortOptionLabel(option: StudentSort, locale: Locale) {
  const labels: Partial<Record<StudentSort, Parameters<typeof t>[1]>> = {
    name_asc: "individual.sortName",
    grade_desc: "individual.sortGradeHigh",
    grade_asc: "individual.sortGradeLow",
    efficiency_desc: "individual.sortEfficiency",
    improvement_desc: "individual.sortImprovement",
    consistency_desc: "individual.sortConsistency",
    records_desc: "individual.sortRecords",
  };
  const key = labels[option];
  return key ? t(locale, key) : "";
}

function bandForAverage(value: number) {
  if (value >= 90) {
    return "Advanced";
  }
  if (value >= 75) {
    return "Proficient";
  }
  if (value >= 60) {
    return "Approaching";
  }
  return "Needs support";
}

function studentKey(record: NormalizedRecord) {
  return record.studentId?.trim() || record.studentName?.trim() || "";
}

function displayStudentLabel(record: NormalizedRecord) {
  return record.studentName?.trim() || record.studentId?.trim() || "Student";
}

function secondaryStudentLabel(record: NormalizedRecord) {
  const parts = [record.studentId, record.subject, record.term].map((part) => part?.trim()).filter(Boolean);
  return parts.join(" | ") || "Student record group";
}

function recordCategory(record: NormalizedRecord) {
  return record.topic || record.metricName || record.assessment || firstDimension(record) || record.subject || "Unspecified";
}

function recordSubject(record: NormalizedRecord) {
  return record.subject || record.term || record.assessment || "Unspecified";
}

function firstDimension(record: NormalizedRecord) {
  return Object.values(record.dimensions ?? {}).find((value) => value.trim()) ?? "";
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

function linearSlope(points: number[][]) {
  const n = points.length;
  if (n < 2) {
    return 0;
  }

  const sumX = points.reduce((sum, [x]) => sum + x, 0);
  const sumY = points.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumX2 = points.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sumX2 - sumX ** 2;
  return denominator ? (n * sumXY - sumX * sumY) / denominator : 0;
}

function masteryRate(values: number[]) {
  return values.length ? round((values.filter((value) => value >= 80).length / values.length) * 100, 1) : 0;
}

function efficiencyTier(score: number): EfficiencyTier {
  if (score >= 88) {
    return "Elite";
  }
  if (score >= 78) {
    return "Strong";
  }
  if (score >= 65) {
    return "Steady";
  }
  return "Developing";
}

function localizeEfficiencyTier(tier: EfficiencyTier, locale: Locale) {
  if (locale !== "mn") {
    return tier;
  }

  const labels: Record<EfficiencyTier, string> = {
    Elite: "Элит",
    Strong: "Хүчтэй",
    Steady: "Тогтвортой",
    Developing: "Хөгжиж буй",
  };
  return labels[tier];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatSignedChange(value: number) {
  if (!Number.isFinite(value)) {
    return "0 pts";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)} pts`;
}

function trendColor(direction: TrendDirection) {
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
