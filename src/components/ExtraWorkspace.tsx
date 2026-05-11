"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Expand, GripVertical, Info, Network, ShieldCheck, Sparkles } from "lucide-react";
import { computeExtraAnalyticsInWorker } from "@/hooks/useExtraAnalyticsWorker";
import { buildTimelineSeries, timelineTickFormatter, timelineTooltipLabel } from "@/lib/chartTimeline";
import { configuredHfToken, defaultAiModel, requestExtraAiInsight } from "@/lib/huggingFace";
import { localizeDirection, localizeLabel, t, type Locale } from "@/lib/i18n";
import type { ExtraAnalyticsResult } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

const moduleDefaults = [
  "relationships",
  "coverage",
  "progression",
  "archetypes",
  "assessment",
  "anomalies",
  "radar",
] as const;

type ModuleKey = (typeof moduleDefaults)[number];

const moduleTitles: Record<ModuleKey, string> = {
  relationships: "Relationship Intelligence",
  coverage: "Curriculum Coverage",
  progression: "Progression Momentum",
  archetypes: "Anonymous Cohort Archetypes",
  assessment: "Assessment Intelligence",
  anomalies: "Pattern Signals",
  radar: "Intelligence Profile",
};

function moduleTitle(key: ModuleKey, locale: Locale) {
  const keys: Record<ModuleKey, Parameters<typeof t>[1]> = {
    relationships: "extra.relationships",
    coverage: "extra.coverage",
    progression: "extra.progression",
    archetypes: "extra.archetypesModule",
    assessment: "extra.assessment",
    anomalies: "extra.patterns",
    radar: "extra.profile",
  };

  return locale === "mn" ? t(locale, keys[key]) : moduleTitles[key];
}

const extraColors = ["#16726d", "#c65d21", "#2f69a1", "#b8860b", "#b63f3f", "#7a5aa6"];

export function ExtraWorkspace() {
  const {
    locale,
    normalized,
    extraAnalytics,
    setExtraAnalytics,
    extraAiInsight,
    setExtraAiInsight,
    setError,
  } = useAnalyticsStore();
  const [focus, setFocus] = useState<string>("all");
  const [fullscreen, setFullscreen] = useState<ModuleKey | null>(null);
  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(() => readLayout());
  const [dragging, setDragging] = useState<ModuleKey | null>(null);
  const requestedExtra = useRef(false);

  useEffect(() => {
    if (!normalized?.records.length || extraAnalytics || requestedExtra.current) {
      return;
    }

    requestedExtra.current = true;
    computeExtraAnalyticsInWorker(normalized.records)
      .then(setExtraAnalytics)
      .catch((error) => setError(error instanceof Error ? error.message : "Extra analytics failed."))
      .finally(() => {
        requestedExtra.current = false;
      });
  }, [extraAnalytics, normalized?.records, setError, setExtraAnalytics]);

  useEffect(() => {
    if (!extraAnalytics || extraAiInsight || !configuredHfToken) {
      return;
    }

    void requestExtraAiInsight({
      token: configuredHfToken,
      model: defaultAiModel,
      extraAnalytics,
      locale,
    })
      .then(setExtraAiInsight)
      .catch(() =>
        setExtraAiInsight({
          summary:
            locale === "mn"
              ? "Extra AI тайлбар одоогоор боломжгүй байна. Дэвшилтэт статистик модуль хэвээр ажиллана."
              : "Extra AI interpretation is unavailable. The advanced statistical modules remain available.",
          trends: [],
          instructionalFocus: [],
          cautions: [locale === "mn" ? "AI ашиглах боломжтой Extra хураангуй буцаасангүй." : "AI did not return a usable Extra summary."],
          chartSuggestions: [],
        }),
      );
  }, [extraAiInsight, extraAnalytics, locale, setExtraAiInsight]);

  const filtered = useMemo(() => filterExtra(extraAnalytics, focus), [extraAnalytics, focus]);

  function moveModule(target: ModuleKey) {
    if (!dragging || dragging === target) {
      return;
    }

    const next = [...moduleOrder];
    const from = next.indexOf(dragging);
    const to = next.indexOf(target);
    next.splice(from, 1);
    next.splice(to, 0, dragging);
    setModuleOrder(next);
    localStorage.setItem("extra_layout", JSON.stringify(next));
  }

  if (!extraAnalytics || !filtered) {
    return (
      <section className="metric-panel interactive-panel reveal-up p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">Extra</p>
        <h2 className="mt-2 text-2xl font-semibold">{t(locale, "extra.loadingTitle")}</h2>
        <div className="mt-5 h-2 rounded bg-[#e6ebe5]">
          <div className="h-2 w-2/3 animate-pulse rounded bg-[#16726d]" />
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page scale-in flex flex-col gap-5">
      <div className="metric-panel interactive-panel min-w-0 overflow-hidden">
        <div className="grid min-w-0 gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] xl:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "extra.kicker")}</p>
            <h2 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-[#1c1f23]">{t(locale, "extra.title")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">
              {t(locale, "extra.body")}
            </p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <TerminalMetric label={t(locale, "extra.records")} value={extraAnalytics.recordCount.toLocaleString()} />
            <TerminalMetric label={t(locale, "extra.imbalance")} value={formatNumber(extraAnalytics.coverage.imbalanceIndex, 2)} />
            <TerminalMetric label={t(locale, "extra.instability")} value={formatNumber(extraAnalytics.progression.instabilityIndex)} />
          </div>
        </div>
      </div>

      <div className="metric-panel p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-normal text-[#5b635f]">{t(locale, "extra.dimensionLens")}</span>
            <button
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold transition",
                focus === "all" ? "border-[#16726d] bg-[#16726d] text-white" : "border-[#bec8c0] bg-white text-[#3f4642] hover:bg-[#f1f4f1]",
              )}
              type="button"
              onClick={() => setFocus("all")}
            >
              {t(locale, "extra.allDimensions")}
            </button>
            {extraAnalytics.coverage.items.slice(0, 8).map((item) => (
              <button
                key={item.label}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold transition",
                  focus === item.label ? "border-[#c65d21] bg-[#c65d21] text-white" : "border-[#bec8c0] bg-white text-[#3f4642] hover:bg-[#f1f4f1]",
                )}
                type="button"
                onClick={() => setFocus(item.label)}
              >
                {localizeLabel(item.label, locale)}
              </button>
            ))}
          </div>
        </div>
        <SignalStrip extra={extraAnalytics} locale={locale} />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {moduleOrder.map((key, index) => (
          <ExtraModule
            key={key}
            id={key}
            index={index}
            title={moduleTitle(key, locale)}
            onFullscreen={() => setFullscreen(key)}
            onDragStart={() => setDragging(key)}
            onDragEnter={() => moveModule(key)}
            onDragEnd={() => setDragging(null)}
          >
            {renderModule(key, filtered, setFocus, false, locale)}
          </ExtraModule>
        ))}
      </div>

      <ExtraAiPanel />

      {fullscreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="h-[min(840px,90vh)] w-[min(1200px,95vw)] overflow-auto rounded-lg border border-[#d9ded8] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{moduleTitle(fullscreen, locale)}</h3>
              <button
                className="rounded border border-[#bec8c0] px-3 py-2 text-sm font-semibold hover:bg-[#f1f4f1]"
                type="button"
                onClick={() => setFullscreen(null)}
              >
                {t(locale, "common.close")}
              </button>
            </div>
            <div className="min-h-[520px]">{renderModule(fullscreen, filtered, setFocus, true, locale)}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TerminalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] px-4 py-3">
      <div className="truncate text-xs font-semibold uppercase tracking-normal text-[#6b746f]" title={label}>
        {label}
      </div>
      <div className="mt-1 truncate text-2xl font-semibold text-[#1c1f23]">{value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#e6ebe5]">
        <div className="animated-bar h-1.5 w-2/3 rounded bg-[#16726d]" />
      </div>
    </div>
  );
}

function SignalStrip({ extra, locale }: { extra: ExtraAnalyticsResult; locale: Locale }) {
  const signals = [
    [t(locale, "extra.strongLinks"), extra.relationships.links.filter((link) => link.strength === "strong").length.toString(), "#16726d"],
    [t(locale, "extra.coverageFlags"), (extra.coverage.overrepresented.length + extra.coverage.underrepresented.length).toString(), "#c65d21"],
    [t(locale, "extra.anomalies"), extra.anomalies.length.toString(), "#b63f3f"],
    [t(locale, "extra.archetypes"), extra.archetypes.filter((item) => item.count > 0).length.toString(), "#2f69a1"],
  ];

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map(([label, value, color], index) => (
        <div key={label} className="reveal-up rounded border border-[#d9ded8] bg-white p-3" style={{ animationDelay: `${120 + index * 60}ms` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">{label}</span>
            <span className="text-lg font-semibold text-[#1c1f23]">{value}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#e6ebe5]">
            <div className="animated-bar h-1 rounded" style={{ width: `${24 + Number(value) * 12}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtraModule({
  id,
  index,
  title,
  children,
  onFullscreen,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  id: ModuleKey;
  index: number;
  title: string;
  children: React.ReactNode;
  onFullscreen: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}) {
  const { locale } = useAnalyticsStore();
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <article
      className={cn(
        "metric-panel interactive-panel reveal-up min-w-0 overflow-hidden p-5",
        moduleSpan(id),
      )}
      style={{ animationDelay: `${index * 70}ms` }}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
          <GripVertical className="h-4 w-4 text-[#8a948f]" />
          {title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-2 text-xs font-semibold text-[#4f5954] transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md"
            type="button"
            aria-expanded={showExplanation}
            onClick={() => setShowExplanation((current) => !current)}
          >
            <Info className="h-3.5 w-3.5 text-[#16726d]" />
            <span className="hidden sm:inline">{t(locale, showExplanation ? "charts.hideExplanation" : "charts.explain")}</span>
          </button>
          <button
            className="rounded border border-[#bec8c0] p-2 text-[#4f5954] transition hover:-translate-y-0.5 hover:bg-[#f1f4f1] hover:shadow-md"
            type="button"
            title={t(locale, "extra.fullscreen")}
            onClick={onFullscreen}
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showExplanation ? (
        <div className="mb-4 rounded border border-[#cdd8d0] bg-[#f7faf7] p-3 text-sm leading-6 text-[#3f4642]">
          {extraModuleExplanation(id, locale)}
        </div>
      ) : null}
      {children}
    </article>
  );
}

function extraModuleExplanation(id: ModuleKey, locale: Locale) {
  const en: Record<ModuleKey, string> = {
    relationships:
      "Shows statistical relationships between mapped categories, skills, standards, or topics. Stronger links mean scores moved together more often; this does not prove causation.",
    coverage:
      "Shows how assessment records are distributed across curriculum dimensions. Use it to find overrepresented or underrepresented areas, not to judge instruction quality.",
    progression:
      "Shows past-to-present movement, rolling average, and volatility when ordered or dated records exist. It describes observed movement only and does not predict future outcomes.",
    archetypes:
      "Groups anonymous classroom-level record patterns such as consistent, volatile, or improving cohorts. It never exposes, ranks, or scores individual students.",
    assessment:
      "Reviews assessments as data objects: variance, diversity, repeated focus, and scoring spread. It flags statistical patterns without assigning blame.",
    anomalies:
      "Lists unusual aggregate swings, volatile categories, or polarized distributions. These are review prompts, not claims about motivation, discipline, or ability.",
    radar:
      "Summarizes advanced classroom signals on one profile chart so coverage, stability, relationship density, and confidence can be compared quickly.",
  };
  const mn: Record<ModuleKey, string> = {
    relationships:
      "Зураглагдсан ангилал, чадвар, стандарт эсвэл сэдвүүдийн статистик хамаарлыг харуулна. Илүү хүчтэй холбоо нь оноонууд хамт хөдөлсөн дохио бөгөөд шалтгаан гэж нотлохгүй.",
    coverage:
      "Үнэлгээний рекордууд сургалтын хэмжээсүүдэд хэрхэн тархсаныг харуулна. Хэт их эсвэл дутуу төлөөлөгдсөн хэсгийг олоход ашиглана; заах чанарыг дүгнэхгүй.",
    progression:
      "Огноотой эсвэл дараалсан рекорд байгаа үед өнгөрснөөс одоог хүртэлх хөдөлгөөн, rolling дундаж, хэлбэлзлийг харуулна. Ирээдүйг таамаглахгүй.",
    archetypes:
      "Тогтвортой, хэлбэлзэлтэй, сайжирч буй зэрэг нэргүй ангийн түвшний хэв шинжийг бүлэглэнэ. Хувь сурагчийг ил гаргах, эрэмбэлэх, оноо өгөхгүй.",
    assessment:
      "Үнэлгээг өгөгдлийн объект байдлаар харна: варианс, олон янз байдал, давтагдсан төвлөрөл, онооны тархалт. Буруутгалгүй статистик хэв шинжийг л тэмдэглэнэ.",
    anomalies:
      "Нэгтгэсэн огцом хэлбэлзэл, тогтворгүй ангилал, туйлширсан тархалтыг жагсаана. Энэ нь хянах дохио болохоос сэдэл, сахилга, чадварын тухай дүгнэлт биш.",
    radar:
      "Хамралт, тогтвортой байдал, хамаарлын нягтрал, итгэлцүүр зэрэг дэвшилтэт дохиог нэг профайл графикт нэгтгэн хурдан харьцуулна.",
  };

  return locale === "mn" ? mn[id] : en[id];
}

function moduleSpan(id: ModuleKey) {
  const spans: Record<ModuleKey, string> = {
    relationships: "xl:col-span-12",
    coverage: "xl:col-span-6",
    progression: "xl:col-span-6",
    assessment: "xl:col-span-8",
    archetypes: "xl:col-span-4",
    anomalies: "xl:col-span-6",
    radar: "xl:col-span-6",
  };

  return spans[id];
}

function renderModule(
  key: ModuleKey,
  extra: ExtraAnalyticsResult,
  setFocus: (focus: string) => void,
  fullscreen = false,
  locale: Locale = "en",
) {
  const height = fullscreen ? 520 : 310;

  if (key === "relationships") {
    if (extra.relationships.nodes.length < 2) {
      return <NothingHere />;
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <CorrelationHeatmap extra={extra} locale={locale} />
        <RelationshipNetwork extra={extra} locale={locale} />
      </div>
    );
  }

  if (key === "coverage") {
    if (!extra.coverage.items.length) {
      return <NothingHere />;
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={extra.coverage.items.slice(0, 16).map((item) => ({ ...item, label: localizeLabel(item.label, locale) }))}
            margin={{ left: 0, right: 12, bottom: 60 }}
          >
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis dataKey="label" angle={-35} textAnchor="end" interval={0} height={72} tick={{ fill: "#5b635f", fontSize: 11 }} />
          <YAxis tick={{ fill: "#5b635f" }} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #d9ded8", color: "#1c1f23" }} />
          <Bar
            dataKey="share"
            name={t(locale, "extra.coverageShare")}
            radius={[4, 4, 0, 0]}
            onClick={(_item, index) => {
              const selected = extra.coverage.items.slice(0, 16)[index];
              if (selected) {
                setFocus(selected.label);
              }
            }}
          >
            {extra.coverage.items.slice(0, 16).map((item, index) => (
              <Cell
                key={item.label}
                fill={item.status === "overrepresented" ? "#c65d21" : item.status === "underrepresented" ? "#b63f3f" : extraColors[index % extraColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (key === "progression") {
    return <ProgressionMomentum extra={extra} height={height} locale={locale} />;
  }

  if (key === "archetypes") {
    const visibleArchetypes = extra.archetypes.filter((item) => item.count > 0);
    if (!visibleArchetypes.length) {
      return <NothingHere />;
    }

    return (
      <div className="grid gap-3">
        {visibleArchetypes.map((item) => (
          <div key={item.id} className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{localizeLabel(item.label, locale)}</span>
              <span className="text-sm font-semibold text-[#16726d]">{formatPercent(item.share)}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#5b635f]">{localizeLabel(item.description, locale)}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#5b635f]">
              <span>{t(locale, "common.count")} {item.count}</span>
              <span>{t(locale, "common.average")} {formatPercent(item.average)}</span>
              <span>{locale === "mn" ? "Хэлб." : "Vol"} {formatNumber(item.volatility)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (key === "assessment") {
    if (!extra.assessments.length) {
      return <NothingHere />;
    }

    return (
      <div className="max-h-[330px] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#f1f4f1] text-xs uppercase tracking-normal text-[#5b635f]">
            <tr>
              <th className="py-2 pr-3">{t(locale, "extra.assessmentCol")}</th>
              <th className="py-2 pr-3">{t(locale, "extra.variance")}</th>
              <th className="py-2 pr-3">{t(locale, "extra.diversity")}</th>
              <th className="py-2 pr-3">{t(locale, "extra.flags")}</th>
            </tr>
          </thead>
          <tbody>
            {extra.assessments.map((item) => (
              <tr key={item.label} className="border-t border-[#eef1ed] transition hover:bg-[#f7faf7]">
                <td className="py-2 pr-3 font-medium">{localizeLabel(item.label, locale)}</td>
                <td className="py-2 pr-3">{formatNumber(item.variance)}</td>
                <td className="py-2 pr-3">{item.topicDiversity}</td>
                <td className="py-2 pr-3 text-[#c65d21]">
                  {item.flags.length ? item.flags.map((flag) => localizeLabel(flag, locale)).join(", ") : t(locale, "extra.balanced")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (key === "anomalies") {
    if (!extra.anomalies.length) {
      return <NothingHere />;
    }

    return (
      <div className="grid gap-2">
        {extra.anomalies.slice(0, 8).map((item) => (
          <div key={`${item.type}-${item.label}`} className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{localizeLabel(item.label, locale)}</span>
              <span className="rounded bg-[#fff1c9] px-2 py-1 text-xs font-semibold text-[#8a5f00]">{localizeLabel(item.type, locale)}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#5b635f]">{localizeLabel(item.description, locale)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (!extra.radar.length) {
    return <NothingHere />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={extra.radar.map((item) => ({ ...item, metric: localizeLabel(item.metric, locale) }))} outerRadius="72%">
        <PolarGrid stroke="#d9ded8" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#5b635f", fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b746f", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#16726d" fill="#16726d" fillOpacity={0.24} />
        <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #d9ded8", color: "#1c1f23" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ProgressionMomentum({ extra, height, locale }: { extra: ExtraAnalyticsResult; height: number; locale: Locale }) {
  const points = extra.progression.points;
  if (points.length < 2) {
    return <NothingHere />;
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const change = latest.rollingAverage - first.rollingAverage;
  const chartHeight = Math.max(220, height - 92);
  const progressionSeries = buildTimelineSeries(points, (point) => point.label, locale);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ProgressionMetric label={t(locale, "extra.earlier")} value={formatPercent(first.rollingAverage)} sublabel={localizeLabel(first.label, locale)} />
        <ProgressionMetric
          label={t(locale, "extra.movement")}
          value={formatExtraChange(change)}
          sublabel={localizeDirection(extra.progression.direction, locale)}
          tone={extra.progression.direction}
        />
        <ProgressionMetric label={t(locale, "extra.latest")} value={formatPercent(latest.rollingAverage)} sublabel={localizeLabel(latest.label, locale)} />
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={progressionSeries.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9ded8" />
          <XAxis
            dataKey="timelineValue"
            type={progressionSeries.useTimeScale ? "number" : "category"}
            scale={progressionSeries.useTimeScale ? "time" : undefined}
            domain={progressionSeries.useTimeScale ? ["dataMin", "dataMax"] : undefined}
            tick={{ fill: "#5b635f", fontSize: 11 }}
            tickFormatter={progressionSeries.useTimeScale ? timelineTickFormatter(locale) : undefined}
          />
          <YAxis tick={{ fill: "#5b635f" }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #d9ded8", color: "#1c1f23" }}
            labelFormatter={progressionSeries.useTimeScale ? timelineTooltipLabel(locale) : undefined}
          />
          <Line type="linear" dataKey="average" name={t(locale, "common.average")} stroke="#16726d" strokeWidth={2} dot={false} />
          <Line type="linear" dataKey="rollingAverage" name={locale === "mn" ? "Өнхрөх ахиц" : "Rolling momentum"} stroke="#c65d21" strokeWidth={2} dot />
          <Line dataKey="volatility" name={locale === "mn" ? "Хэлбэлзэл" : "Volatility"} stroke="#b63f3f" strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressionMetric({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone?: ExtraAnalyticsResult["progression"]["direction"];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
      <div className="truncate text-xs font-semibold uppercase tracking-normal text-[#6b746f]" title={label}>
        {label}
      </div>
      <div className="mt-1 truncate text-2xl font-semibold" style={{ color: tone ? extraTrendColor(tone) : "#1c1f23" }}>
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-[#5b635f]" title={sublabel}>
        {sublabel}
      </div>
    </div>
  );
}

function CorrelationHeatmap({ extra, locale }: { extra: ExtraAnalyticsResult; locale: Locale }) {
  const nodes = extra.relationships.nodes.slice(0, 10);
  const matrix = new Map(extra.relationships.matrix.map((item) => [`${item.source}:${item.target}`, item.correlation]));

  if (nodes.length < 2) {
    return <NothingHere />;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#4f5954]">
        <Network className="h-4 w-4 text-[#16726d]" />
        {t(locale, "extra.correlationMatrix")}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[620px] gap-1" style={{ gridTemplateColumns: `120px repeat(${nodes.length}, minmax(32px, 1fr))` }}>
          <div />
          {nodes.map((node) => (
            <div key={node.id} className="truncate text-[10px] font-medium text-[#6b746f]" title={node.id}>
              {localizeLabel(node.id, locale)}
            </div>
          ))}
          {nodes.map((row) => (
            <Fragment key={row.id}>
              <div key={`${row.id}-label`} className="truncate text-[10px] font-medium text-[#4f5954]" title={row.id}>
                {localizeLabel(row.id, locale)}
              </div>
              {nodes.map((column) => {
                const value = matrix.get(`${row.id}:${column.id}`) ?? 0;
                const isSelfComparison = row.id === column.id;
                return (
                  <div
                    key={`${row.id}-${column.id}`}
                    className="h-7 rounded text-center text-[10px] font-semibold leading-7 text-white shadow-sm"
                    title={
                      isSelfComparison
                        ? `${localizeLabel(row.id, locale)} ${t(locale, "extra.selfComparison")}`
                        : `${localizeLabel(row.id, locale)} x ${localizeLabel(column.id, locale)}: ${value}`
                    }
                    style={{ background: correlationColor(value, isSelfComparison) }}
                  >
                    {isSelfComparison ? t(locale, "extra.same") : Math.abs(value) >= 0.4 ? value : ""}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function RelationshipNetwork({ extra, locale }: { extra: ExtraAnalyticsResult; locale: Locale }) {
  const nodes = extra.relationships.nodes.slice(0, 10);
  const links = extra.relationships.links.filter((link) => nodes.some((node) => node.id === link.source) && nodes.some((node) => node.id === link.target));
  const center = 145;
  const radius = 106;
  const positions = new Map(
    nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [
        node.id,
        {
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius,
        },
      ];
    }),
  );

  if (!links.length) {
    return <NothingHere />;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#4f5954]">
        <Activity className="h-4 w-4 text-[#c65d21]" />
        {t(locale, "extra.relationshipMap")}
      </div>
      <svg className="h-[290px] w-full rounded border border-[#d9ded8] bg-white" viewBox="0 0 290 290" role="img">
        {links.map((link) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (!source || !target) {
            return null;
          }
          return (
            <line
              key={`${link.source}-${link.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={link.correlation >= 0 ? "#16726d" : "#b63f3f"}
              strokeWidth={1 + Math.abs(link.correlation) * 3}
              opacity={0.65}
            />
          );
        })}
        {nodes.map((node, index) => {
          const position = positions.get(node.id);
          if (!position) {
            return null;
          }
          return (
            <g key={node.id}>
              <circle cx={position.x} cy={position.y} r={10 + Math.min(10, node.count / 6)} fill={extraColors[index % extraColors.length]} />
              <text x={position.x} y={position.y + 26} textAnchor="middle" fill="#3f4642" fontSize="9">
                {localizeLabel(node.id, locale).slice(0, 14)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function NothingHere() {
  const { locale } = useAnalyticsStore();
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded border border-dashed border-[#d9ded8] bg-[#f7faf7] p-6 text-center text-sm font-semibold text-[#6b746f]">
      {t(locale, "common.nothing")}
    </div>
  );
}

function ExtraAiPanel() {
  const { locale, extraAiInsight } = useAnalyticsStore();

  return (
    <div className="metric-panel interactive-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#16726d]" />
        <h3 className="text-lg font-semibold">{t(locale, "extra.aiBrief")}</h3>
        <span className="rounded bg-[#eef8f5] px-2 py-1 text-xs font-semibold text-[#0f5a55]">{t(locale, "common.aggregateOnly")}</span>
      </div>
      {extraAiInsight ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <p className="text-sm leading-6 text-[#3f4642]">{extraAiInsight.summary}</p>
          <div className="grid gap-2 text-sm text-[#4f5954]">
            {extraAiInsight.trends.slice(0, 3).map((trend, index) => (
              <div key={`${trend}-${index}`} className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
                {trend}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#5b635f]">{t(locale, "extra.aiPreparing")}</p>
      )}
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#6b746f]">
        <ShieldCheck className="h-4 w-4" />
        {t(locale, "extra.aiSafety")}
      </div>
    </div>
  );
}

function filterExtra(extra: ExtraAnalyticsResult | undefined, focus: string) {
  if (!extra || focus === "all") {
    return extra;
  }

  return {
    ...extra,
    relationships: {
      ...extra.relationships,
      links: extra.relationships.links.filter((link) => link.source === focus || link.target === focus),
    },
    anomalies: extra.anomalies.filter((item) => item.label === focus || item.description.includes(focus)),
  };
}

function correlationColor(value: number, isSelfComparison = false) {
  if (isSelfComparison) {
    return "#7a5aa6";
  }

  if (value >= 0.65) {
    return "#16726d";
  }
  if (value >= 0.35) {
    return "#2f69a1";
  }
  if (value <= -0.65) {
    return "#b63f3f";
  }
  if (value <= -0.35) {
    return "#c65d21";
  }
  return "#cfd8d2";
}

function formatExtraChange(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)} pts`;
}

function extraTrendColor(direction: ExtraAnalyticsResult["progression"]["direction"]) {
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

function readLayout(): ModuleKey[] {
  if (typeof window === "undefined") {
    return [...moduleDefaults];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem("extra_layout") ?? "[]") as ModuleKey[];
    const valid = parsed.filter((item): item is ModuleKey => moduleDefaults.includes(item));
    return valid.length === moduleDefaults.length ? valid : [...moduleDefaults];
  } catch {
    return [...moduleDefaults];
  }
}
