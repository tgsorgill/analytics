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
import { Activity, Expand, GripVertical, Network, ShieldCheck, Sparkles } from "lucide-react";
import { computeExtraAnalyticsInWorker } from "@/hooks/useExtraAnalyticsWorker";
import { configuredHfToken, defaultAiModel, requestExtraAiInsight } from "@/lib/huggingFace";
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

const extraColors = ["#20a39e", "#f28c38", "#5b8def", "#d4a72c", "#d65f5f", "#9b7ede"];

export function ExtraWorkspace() {
  const {
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
    })
      .then(setExtraAiInsight)
      .catch(() =>
        setExtraAiInsight({
          summary: "Extra AI interpretation is unavailable. The advanced statistical modules remain available.",
          trends: [],
          instructionalFocus: [],
          cautions: ["AI did not return a usable Extra summary."],
          chartSuggestions: [],
        }),
      );
  }, [extraAiInsight, extraAnalytics, setExtraAiInsight]);

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
      <section className="rounded-lg border border-[#263238] bg-[#101418] p-6 text-[#dbe7e4]">
        <p className="text-sm font-semibold uppercase tracking-normal text-[#20a39e]">Extra</p>
        <h2 className="mt-2 text-2xl font-semibold">Building advanced classroom intelligence.</h2>
        <div className="mt-5 h-2 rounded bg-[#263238]">
          <div className="h-2 w-2/3 animate-pulse rounded bg-[#20a39e]" />
        </div>
      </section>
    );
  }

  return (
    <section className="extra-shell scale-in overflow-hidden rounded-xl border border-[#23323a] text-[#e7eceb] shadow-2xl">
      <div className="terminal-grid border-b border-[#23323a] bg-[#101821]/95 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-[#20c9bd]">Extra Advanced Intelligence</p>
            <h2 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight text-white">Deep classroom performance layer</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#bfccc9]">
              Relationship maps, curriculum coverage, volatility, assessment signals, and anonymous cohort archetypes.
              Statistical relationships only. No causation or child evaluation.
            </p>
          </div>
          <div className="grid min-w-[360px] gap-3 sm:grid-cols-3">
            <TerminalMetric label="Records" value={extraAnalytics.recordCount.toLocaleString()} />
            <TerminalMetric label="Imbalance" value={formatNumber(extraAnalytics.coverage.imbalanceIndex, 2)} />
            <TerminalMetric label="Instability" value={formatNumber(extraAnalytics.progression.instabilityIndex)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-normal text-[#7f918d]">Dimension lens</span>
          <button
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-semibold transition",
              focus === "all" ? "border-[#20c9bd] bg-[#173d3b] text-white" : "border-[#33424a] bg-[#0d1318] text-[#c9d4d1] hover:border-[#526872]",
            )}
            type="button"
            onClick={() => setFocus("all")}
          >
            All dimensions
          </button>
          {extraAnalytics.coverage.items.slice(0, 8).map((item) => (
            <button
              key={item.label}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold transition",
                focus === item.label ? "border-[#f28c38] bg-[#4a2a16] text-white" : "border-[#33424a] bg-[#0d1318] text-[#c9d4d1] hover:border-[#526872]",
              )}
              type="button"
              onClick={() => setFocus(item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <SignalStrip extra={extraAnalytics} />
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-12">
        {moduleOrder.map((key, index) => (
          <ExtraModule
            key={key}
            id={key}
            index={index}
            title={moduleTitles[key]}
            onFullscreen={() => setFullscreen(key)}
            onDragStart={() => setDragging(key)}
            onDragEnter={() => moveModule(key)}
            onDragEnd={() => setDragging(null)}
          >
            {renderModule(key, filtered, setFocus)}
          </ExtraModule>
        ))}
      </div>

      <ExtraAiPanel />

      {fullscreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="h-[min(840px,90vh)] w-[min(1200px,95vw)] overflow-auto rounded-lg border border-[#33424a] bg-[#0f1318] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{moduleTitles[fullscreen]}</h3>
              <button
                className="rounded border border-[#33424a] px-3 py-2 text-sm font-semibold hover:bg-[#151b21]"
                type="button"
                onClick={() => setFullscreen(null)}
              >
                Close
              </button>
            </div>
            <div className="min-h-[520px]">{renderModule(fullscreen, filtered, setFocus, true)}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TerminalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="interactive-dark rounded-lg border border-[#33424a] bg-[#0b1014]/95 px-4 py-3 shadow-lg transition">
      <div className="text-xs uppercase tracking-normal text-[#7f918d]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 h-1 rounded bg-[#23323a]">
        <div className="pulse-line h-1 w-2/3 rounded bg-[#20c9bd]" />
      </div>
    </div>
  );
}

function SignalStrip({ extra }: { extra: ExtraAnalyticsResult }) {
  const signals = [
    ["Strong links", extra.relationships.links.filter((link) => link.strength === "strong").length.toString(), "#20c9bd"],
    ["Coverage flags", (extra.coverage.overrepresented.length + extra.coverage.underrepresented.length).toString(), "#f28c38"],
    ["Anomalies", extra.anomalies.length.toString(), "#d65f5f"],
    ["Archetypes", extra.archetypes.filter((item) => item.count > 0).length.toString(), "#5b8def"],
  ];

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map(([label, value, color], index) => (
        <div
          key={label}
          className="reveal-up rounded-lg border border-[#263238] bg-[#0b1014]/70 p-3"
          style={{ animationDelay: `${120 + index * 60}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-normal text-[#7f918d]">{label}</span>
            <span className="text-lg font-semibold text-white">{value}</span>
          </div>
          <div className="mt-2 h-1 rounded bg-[#23323a]">
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
  return (
    <article
      className={cn(
        "extra-panel extra-card interactive-dark reveal-up rounded-xl border border-[#263238] p-5 transition hover:border-[#3f5661]",
        moduleSpan(id),
      )}
      style={{ animationDelay: `${index * 70}ms` }}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
          <GripVertical className="h-4 w-4 text-[#6f817d]" />
          {title}
        </h3>
        <button
          className="rounded border border-[#33424a] p-2 text-[#c9d4d1] transition hover:-translate-y-0.5 hover:bg-[#202a31] hover:shadow-lg"
          type="button"
          title="Open fullscreen"
          onClick={onFullscreen}
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>
      {children}
    </article>
  );
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
) {
  const height = fullscreen ? 520 : 310;

  if (key === "relationships") {
    if (extra.relationships.nodes.length < 2) {
      return <NothingHere />;
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <CorrelationHeatmap extra={extra} />
        <RelationshipNetwork extra={extra} />
      </div>
    );
  }

  if (key === "coverage") {
    if (!extra.coverage.items.length) {
      return <NothingHere />;
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={extra.coverage.items.slice(0, 16)} margin={{ left: 0, right: 12, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#263238" />
          <XAxis dataKey="label" angle={-35} textAnchor="end" interval={0} height={72} tick={{ fill: "#aebbb7", fontSize: 11 }} />
          <YAxis tick={{ fill: "#aebbb7" }} />
          <Tooltip contentStyle={{ background: "#101418", border: "1px solid #33424a" }} />
          <Bar
            dataKey="share"
            name="Coverage share"
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
                fill={item.status === "overrepresented" ? "#f28c38" : item.status === "underrepresented" ? "#d65f5f" : extraColors[index % extraColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (key === "progression") {
    return <ProgressionMomentum extra={extra} height={height} />;
  }

  if (key === "archetypes") {
    const visibleArchetypes = extra.archetypes.filter((item) => item.count > 0);
    if (!visibleArchetypes.length) {
      return <NothingHere />;
    }

    return (
      <div className="grid gap-3">
        {visibleArchetypes.map((item) => (
          <div key={item.id} className="interactive-dark rounded border border-[#263238] bg-[#101418] p-3 transition hover:border-[#3f5661]">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{item.label}</span>
              <span className="text-sm text-[#20a39e]">{formatPercent(item.share)}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#aebbb7]">{item.description}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#c9d4d1]">
              <span>Count {item.count}</span>
              <span>Avg {formatPercent(item.average)}</span>
              <span>Vol {formatNumber(item.volatility)}</span>
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
          <thead className="sticky top-0 bg-[#151b21] text-xs uppercase tracking-normal text-[#7f918d]">
            <tr>
              <th className="py-2 pr-3">Assessment</th>
              <th className="py-2 pr-3">Variance</th>
              <th className="py-2 pr-3">Diversity</th>
              <th className="py-2 pr-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {extra.assessments.map((item) => (
              <tr key={item.label} className="border-t border-[#263238] transition hover:bg-[#1b252c]">
                <td className="py-2 pr-3 font-medium">{item.label}</td>
                <td className="py-2 pr-3">{formatNumber(item.variance)}</td>
                <td className="py-2 pr-3">{item.topicDiversity}</td>
                <td className="py-2 pr-3 text-[#f28c38]">{item.flags.join(", ") || "balanced"}</td>
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
          <div key={`${item.type}-${item.label}`} className="interactive-dark rounded border border-[#263238] bg-[#101418] p-3 transition hover:border-[#3f5661]">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{item.label}</span>
              <span className="rounded bg-[#3d2419] px-2 py-1 text-xs text-[#f28c38]">{item.type}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#aebbb7]">{item.description}</p>
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
      <RadarChart data={extra.radar} outerRadius="72%">
        <PolarGrid stroke="#33424a" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#aebbb7", fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#7f918d", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#20a39e" fill="#20a39e" fillOpacity={0.28} />
        <Tooltip contentStyle={{ background: "#101418", border: "1px solid #33424a" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ProgressionMomentum({ extra, height }: { extra: ExtraAnalyticsResult; height: number }) {
  const points = extra.progression.points;
  if (points.length < 2) {
    return <NothingHere />;
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const change = latest.rollingAverage - first.rollingAverage;
  const chartHeight = Math.max(220, height - 92);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ProgressionMetric label="Earlier" value={formatPercent(first.rollingAverage)} sublabel={first.label} />
        <ProgressionMetric
          label="Movement"
          value={formatExtraChange(change)}
          sublabel={extra.progression.direction.replace("_", " ")}
          tone={extra.progression.direction}
        />
        <ProgressionMetric label="Latest" value={formatPercent(latest.rollingAverage)} sublabel={latest.label} />
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#263238" />
          <XAxis dataKey="label" tick={{ fill: "#aebbb7", fontSize: 11 }} />
          <YAxis tick={{ fill: "#aebbb7" }} domain={[0, 100]} />
          <Tooltip contentStyle={{ background: "#101418", border: "1px solid #33424a" }} />
          <Line dataKey="average" name="Average" stroke="#20a39e" strokeWidth={2} dot={false} />
          <Line dataKey="rollingAverage" name="Rolling momentum" stroke="#f28c38" strokeWidth={2} dot />
          <Line dataKey="volatility" name="Volatility" stroke="#d65f5f" strokeDasharray="5 5" dot={false} />
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
    <div className="rounded-lg border border-[#263238] bg-[#0b1014]/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-[#7f918d]">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: tone ? extraTrendColor(tone) : "#ffffff" }}>
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-[#aebbb7]">{sublabel}</div>
    </div>
  );
}

function CorrelationHeatmap({ extra }: { extra: ExtraAnalyticsResult }) {
  const nodes = extra.relationships.nodes.slice(0, 10);
  const matrix = new Map(extra.relationships.matrix.map((item) => [`${item.source}:${item.target}`, item.correlation]));

  if (nodes.length < 2) {
    return <NothingHere />;
  }

  return (
    <div className="rounded-lg border border-[#263238] bg-[#101418]/80 p-3">
      <div className="mb-2 inline-flex items-center gap-2 text-sm text-[#aebbb7]">
        <Network className="h-4 w-4 text-[#20a39e]" />
        Correlation matrix
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${nodes.length}, minmax(26px, 1fr))` }}>
        <div />
        {nodes.map((node) => (
          <div key={node.id} className="truncate text-[10px] text-[#7f918d]" title={node.id}>
            {node.id}
          </div>
        ))}
        {nodes.map((row) => (
          <Fragment key={row.id}>
            <div key={`${row.id}-label`} className="truncate text-[10px] text-[#aebbb7]" title={row.id}>
              {row.id}
            </div>
            {nodes.map((column) => {
              const value = matrix.get(`${row.id}:${column.id}`) ?? 0;
              const isSelfComparison = row.id === column.id;
              return (
                <div
                  key={`${row.id}-${column.id}`}
                  className="h-7 rounded text-center text-[10px] leading-7 text-white"
                  title={
                    isSelfComparison
                      ? `${row.id} compared with itself. Always 1.00 by definition.`
                      : `${row.id} x ${column.id}: ${value}`
                  }
                  style={{ background: correlationColor(value, isSelfComparison) }}
                >
                  {isSelfComparison ? "same" : Math.abs(value) >= 0.4 ? value : ""}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RelationshipNetwork({ extra }: { extra: ExtraAnalyticsResult }) {
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
    <div className="rounded-lg border border-[#263238] bg-[#101418]/80 p-3">
      <div className="mb-2 inline-flex items-center gap-2 text-sm text-[#aebbb7]">
        <Activity className="h-4 w-4 text-[#f28c38]" />
        Relationship map
      </div>
      <svg className="h-[290px] w-full rounded border border-[#263238] bg-[#101418]" viewBox="0 0 290 290" role="img">
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
              stroke={link.correlation >= 0 ? "#20a39e" : "#d65f5f"}
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
              <text x={position.x} y={position.y + 26} textAnchor="middle" fill="#c9d4d1" fontSize="9">
                {node.id.slice(0, 14)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function NothingHere() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[#33424a] bg-[#0b1014]/70 p-6 text-center text-sm font-semibold text-[#7f918d]">
      Nothing to see here :p
    </div>
  );
}

function ExtraAiPanel() {
  const { extraAiInsight } = useAnalyticsStore();

  return (
    <div className="border-t border-[#263238] bg-[#101418] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#20a39e]" />
        <h3 className="text-lg font-semibold">Extra AI Brief</h3>
        <span className="rounded bg-[#173d3b] px-2 py-1 text-xs text-[#9ce2d7]">Aggregate only</span>
      </div>
      {extraAiInsight ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <p className="text-sm leading-6 text-[#c9d4d1]">{extraAiInsight.summary}</p>
          <div className="grid gap-2 text-sm text-[#aebbb7]">
            {extraAiInsight.trends.slice(0, 3).map((trend, index) => (
              <div key={`${trend}-${index}`} className="rounded border border-[#263238] p-3">
                {trend}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#aebbb7]">Preparing an aggregate-only advanced interpretation.</p>
      )}
      <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#7f918d]">
        <ShieldCheck className="h-4 w-4" />
        Statistical relationships only. No causation, diagnosis, discipline, or student ranking.
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
    return "#6f5bd6";
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
  return "#263238";
}

function formatExtraChange(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)} pts`;
}

function extraTrendColor(direction: ExtraAnalyticsResult["progression"]["direction"]) {
  if (direction === "improving") {
    return "#20a39e";
  }

  if (direction === "declining") {
    return "#d65f5f";
  }

  if (direction === "flat") {
    return "#d4a72c";
  }

  return "#7f918d";
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
