"use client";

import { Activity, AlertTriangle, Brain, Calculator, Gauge, Layers3, LineChart, Network, Radar, Sigma, Target } from "lucide-react";
import { localizeDirection, localizeLabel, t } from "@/lib/i18n";
import type { AnalyticsResult } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

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

const extraGuide = [
  {
    icon: Network,
    title: "Relationship Intelligence",
    formula: "correlation(vector(category A by cohort), vector(category B by cohort))",
    body: "Compares aggregate category patterns across anonymous cohorts or upload segments. It describes statistical alignment only, never causation.",
  },
  {
    icon: Network,
    title: "Correlation Matrix",
    formula: "Pearson correlation from -1 to +1",
    body: "Each cell compares two dimensions. Diagonal self-comparisons, such as Math Score with Math Score, are colored distinctly because they are always 1.00 by definition and are not a discovered relationship.",
  },
  {
    icon: Activity,
    title: "Relationship Map",
    formula: "show links where abs(correlation) >= 0.42",
    body: "Draws a network of dimensions with weak, moderate, or strong statistical relationships. Thicker links mean stronger absolute correlation.",
  },
  {
    icon: Layers3,
    title: "Curriculum Coverage",
    formula: "coverage share = records in dimension / total records * 100",
    body: "Shows how much of the uploaded dataset is devoted to each topic, skill, unit, standard, or teacher-defined dimension.",
  },
  {
    icon: Layers3,
    title: "Coverage Status",
    formula: "compare coverage share against expected share = 100 / number of dimensions",
    body: "Overrepresented dimensions appear much more often than expected; underrepresented dimensions appear much less often. This is a dataset balance signal, not a judgment of instruction.",
  },
  {
    icon: LineChart,
    title: "Progression Momentum",
    formula: "rolling average over current and previous two time/order groups",
    body: "Tracks classroom movement over time. If dates are missing, Extra uses upload-order segments and labels that limitation.",
  },
  {
    icon: Gauge,
    title: "Volatility",
    formula: "standard deviation within each time/order group",
    body: "Measures how unstable a period or segment is. Higher volatility means records in that segment are more spread out.",
  },
  {
    icon: Brain,
    title: "Anonymous Cohort Archetypes",
    formula: "aggregate cohorts grouped by average, volatility, and trend slope",
    body: "Creates classroom-level archetypes such as improving, volatile, or high-consistency groups. It never exposes or ranks individual students.",
  },
  {
    icon: Calculator,
    title: "Assessment Intelligence",
    formula: "variance, dimension diversity, and concentration per assessment",
    body: "Looks at assessments themselves: score spread, number of dimensions represented, and whether one dimension dominates an assessment.",
  },
  {
    icon: AlertTriangle,
    title: "Pattern Signals",
    formula: "flag swings, volatility, coverage imbalance, and polarized distributions",
    body: "Surfaces unusual aggregate patterns. These are statistical flags for teacher review, not explanations, blame, or diagnoses.",
  },
  {
    icon: Radar,
    title: "Intelligence Profile",
    formula: "normalized 0-100 scores for balance, stability, relationship density, diversity, and confidence",
    body: "Summarizes Extra's advanced signals into a radar-style profile so the workspace can be scanned quickly.",
  },
  {
    icon: Target,
    title: "Dimension Lens",
    formula: "filter Extra modules to one selected dimension label",
    body: "Lets teachers focus the relationship and signal views on a chosen topic, skill, standard, unit, objective, or assessment dimension.",
  },
  {
    icon: Brain,
    title: "Extra AI Brief",
    formula: "AI receives only aggregate Extra analytics JSON",
    body: "Explains advanced findings in teacher-friendly language. It cannot inspect raw CSV rows, evaluate students, infer traits, or create decisions.",
  },
];

export function FormulasWorkspace({ analytics }: { analytics: AnalyticsResult }) {
  const { locale } = useAnalyticsStore();
  return (
    <section className="workspace-page reveal-up flex flex-col gap-5">
      <div className="metric-panel interactive-panel p-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <Calculator className="h-4 w-4" />
          {t(locale, "formulas.kicker")}
        </div>
        <h2 className="mt-3 text-3xl font-semibold">{t(locale, "formulas.title")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">{t(locale, "formulas.body")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {clusterDefinitions.map((item) => {
          const cluster = analytics.clusters.find((candidate) => candidate.label === item.label);
          return (
            <article key={item.label} className="metric-panel interactive-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{localizeLabel(item.label, locale)}</h3>
                <span className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ background: item.color }}>
                  {item.range}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4f5954]">{localizeFormulaText(item.body, locale)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
                  <div className="text-xs uppercase tracking-normal text-[#6b746f]">{t(locale, "common.records")}</div>
                  <div className="mt-1 text-xl font-semibold">{cluster?.count ?? 0}</div>
                </div>
                <div className="rounded border border-[#d9ded8] bg-[#f7faf7] p-3">
                  <div className="text-xs uppercase tracking-normal text-[#6b746f]">{t(locale, "common.average")}</div>
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
                  <h3 className="font-semibold">{localizeFormulaText(item.title, locale)}</h3>
                  <code className="mt-2 block rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-sm text-[#27302c]">
                    {item.formula}
                  </code>
                  <p className="mt-3 text-sm leading-6 text-[#4f5954]">{localizeFormulaText(item.body, locale)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="metric-panel interactive-panel p-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <Network className="h-4 w-4" />
          {t(locale, "formulas.extraKicker")}
        </div>
        <h3 className="mt-3 text-2xl font-semibold">{t(locale, "formulas.extraTitle")}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4f5954]">{t(locale, "formulas.extraBody")}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {extraGuide.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded border border-[#d9ded8] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#e4edf5] text-[#2f69a1]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{localizeFormulaText(item.title, locale)}</h4>
                    <code className="mt-2 block rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-sm text-[#27302c]">
                      {item.formula}
                    </code>
                    <p className="mt-3 text-sm leading-6 text-[#4f5954]">{localizeFormulaText(item.body, locale)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="metric-panel interactive-panel p-5">
        <h3 className="font-semibold">{t(locale, "formulas.snapshot")}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormulaSnapshot label={t(locale, "common.records")} value={analytics.recordCount.toLocaleString()} />
          <FormulaSnapshot label={t(locale, "common.average")} value={formatPercent(analytics.overview.mean)} />
          <FormulaSnapshot label={t(locale, "common.mastery")} value={formatPercent(analytics.overview.masteryRate)} />
          <FormulaSnapshot label={t(locale, "common.stdDev")} value={formatNumber(analytics.overview.standardDeviation)} />
          <FormulaSnapshot label={t(locale, "common.trend")} value={localizeDirection(analytics.trend.direction, locale)} />
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

function localizeFormulaText(value: string, locale: "en" | "mn") {
  if (locale !== "mn") {
    return value;
  }

  const copy: Record<string, string> = {
    "Records below the classroom proficiency band. This is a statistical grouping only, not a student label.":
      "Ангийн чадварын бүсээс доогуур рекордууд. Энэ нь зөвхөн статистик бүлэглэл бөгөөд сурагчийн шошго биш.",
    "Records moving toward proficiency, useful for seeing where reteaching may help the whole group.":
      "Чадварт ойртож буй рекордууд. Бүх бүлэгт дахин заах хэрэгтэй хэсгийг харахад тустай.",
    "Records in the expected performance band for the dashboard's deterministic breakdown.":
      "Самбарын детерминистик задаргааны хүлээгдэж буй гүйцэтгэлийн бүсэд байгаа рекордууд.",
    "Records in the highest local performance band. Scores above 100 are clamped only for distribution charts.":
      "Дотоод гүйцэтгэлийн хамгийн өндөр бүсийн рекордууд. 100-аас дээш оноог зөвхөн тархалтын графикт 100 хүртэл хязгаарлана.",
    "Mastery Rate": "Эзэмшлийн хувь",
    "Average": "Дундаж",
    "Median": "Медиан",
    "Standard Deviation": "Стандарт хазайлт",
    "Consistency Score": "Тогтвортой байдлын оноо",
    "Trend Direction": "Чиг хандлагын чиглэл",
    "Variance": "Варианс",
    "Topic Strength / Weakness": "Сэдвийн давуу / сул тал",
    "Relationship Intelligence": "Хамаарлын аналитик",
    "Correlation Matrix": "Корреляцийн матриц",
    "Relationship Map": "Хамаарлын зураг",
    "Curriculum Coverage": "Хөтөлбөрийн хамралт",
    "Coverage Status": "Хамралтын төлөв",
    "Progression Momentum": "Ахицын хөдөлгөөн",
    "Volatility": "Хэлбэлзэл",
    "Anonymous Cohort Archetypes": "Нэргүй cohort хэв шинж",
    "Assessment Intelligence": "Үнэлгээний аналитик",
    "Pattern Signals": "Загварын дохио",
    "Intelligence Profile": "Аналитик профайл",
    "Dimension Lens": "Хэмжээсийн линз",
    "Extra AI Brief": "Extra AI товч тайлбар",
  };

  if (copy[value]) {
    return copy[value];
  }

  if (value.includes("mastery threshold")) {
    return "Оноо бүрийг 0-100 хувь болгон хөрвүүлсний дараа эзэмшлийн босго буюу түүнээс дээш рекордын хувь.";
  }
  if (value.includes("mean classroom score")) {
    return "Сонгосон нэгтгэсэн рекордуудын ангийн дундаж оноо.";
  }
  if (value.includes("middle score")) {
    return "Эрэмбэлсэн онооны гол утга. Хоёр гол утгатай бол тэдгээрийн дунджийг авна.";
  }
  if (value.includes("spread measure")) {
    return "Тархалтын хэмжүүр. Их байх тусам рекордуудын оноо илүү өөр өөр байна.";
  }
  if (value.includes("statistical alignment")) {
    return "Нэргүй бүлэг эсвэл оруулсан дарааллын хэсгүүдээр ангиллын хэв маягийг харьцуулна. Зөвхөн статистик нийцлийг хэлнэ, шалтгаан биш.";
  }
  if (value.includes("Do not")) {
    return "Энэ модуль нь зөвхөн нэгтгэсэн статистик тайлбар өгнө. Сурагчийг үнэлэх, оношлох, зан төлөв дүгнэх, шийдвэр гаргахгүй.";
  }

  return value;
}
