"use client";

import { ArrowRight, Check, RefreshCcw, ShieldAlert } from "lucide-react";
import { internalFields, type ColumnInference, type ColumnMapping, type HeaderDerivation, type InternalField } from "@/lib/types";
import { validateMappings } from "@/lib/mapping";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { StatusBadge } from "@/components/StatusBadge";
import { fieldLabel, t } from "@/lib/i18n";
import { cn, formatPercent } from "@/lib/utils";

type MappingReviewProps = {
  onRunAnalytics: () => void;
};

export function MappingReview({ onRunAnalytics }: MappingReviewProps) {
  const {
    parsedCsv,
    locale,
    inferences,
    mappings,
    updateMapping,
    setMappingValidation,
    isAnalyzing,
    reset,
  } = useAnalyticsStore();

  if (!parsedCsv) {
    return null;
  }

  const validation = validateMappings(mappings);
  const unresolvedColumns = new Set(validation.needsConfirmation);
  const visibleMappings = validation.canProceed
    ? mappings
    : mappings.filter(
        (mapping) =>
          unresolvedColumns.has(mapping.column) ||
          mapping.field === "score" ||
          validation.errors.some((error) => error.toLowerCase().includes("score")),
      );

  function changeField(column: string, field: InternalField) {
    const inference = inferences.find((candidate) => candidate.column === column);
    const candidate = inference?.candidates.find((item) => item.mappedTo === field);

    updateMapping(column, {
      field,
      confidence: candidate?.confidence ?? (field === "ignore" ? 1 : 0.5),
      confirmed: false,
      headerDerivation: field === "score" ? candidate?.headerDerivation ?? "none" : "none",
            evidence: candidate?.evidence ?? [locale === "mn" ? "Багш энэ зураглалыг гараар сонгосон" : "Teacher selected this mapping manually"],
    });
  }

  function confirmAndRun() {
    const nextValidation = validateMappings(mappings);
    setMappingValidation(nextValidation);
    if (nextValidation.canProceed) {
      onRunAnalytics();
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">{t(locale, "mapping.kicker")}</p>
          <h1 className="text-3xl font-semibold">
            {validation.canProceed ? t(locale, "mapping.reviewTitle") : t(locale, "mapping.chooseScoreTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#5b635f]">
            {parsedCsv.fileName} | {parsedCsv.rowCount.toLocaleString()} rows | {parsedCsv.columns.length} columns
          </p>
          <p className="mt-1 text-sm text-[#5b635f]">
            {t(locale, "mapping.headerDetected", {
              row: parsedCsv.detectedHeaderRow,
              confidence: Math.round(parsedCsv.headerConfidence * 100),
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded border border-[#bec8c0] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#f1f4f1]"
            type="button"
            onClick={reset}
          >
            <RefreshCcw className="h-4 w-4" />
            {t(locale, "common.newUpload")}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded bg-[#16726d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5a55] disabled:cursor-not-allowed disabled:bg-[#90aaa7]"
            type="button"
            onClick={confirmAndRun}
            disabled={isAnalyzing}
          >
            <Check className="h-4 w-4" />
            {isAnalyzing ? t(locale, "processing.analyzing") : validation.canProceed ? t(locale, "mapping.run") : t(locale, "mapping.use")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {validation.canProceed ? <StatusBadge tone="success">{t(locale, "mapping.ready")}</StatusBadge> : null}
        {validation.needsConfirmation.length ? (
          <StatusBadge tone="warning">{t(locale, "mapping.confirmationsNeeded", { count: validation.needsConfirmation.length })}</StatusBadge>
        ) : null}
        {parsedCsv.parseErrors.length ? (
          <StatusBadge tone="warning">{t(locale, "mapping.parseWarnings", { count: parsedCsv.parseErrors.length })}</StatusBadge>
        ) : null}
      </div>

      {validation.errors.length || validation.warnings.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {validation.errors.length ? (
            <MessageList tone="danger" title={t(locale, "mapping.blocked")} messages={validation.errors} />
          ) : null}
          {validation.warnings.length ? (
            <MessageList tone="warning" title={t(locale, "mapping.warnings")} messages={validation.warnings} />
          ) : null}
        </div>
      ) : null}

      {parsedCsv.structureNotes.length ? (
        <MessageList tone="warning" title={t(locale, "mapping.structureNotes")} messages={parsedCsv.structureNotes} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[#d9ded8] bg-white">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_1fr] gap-0 border-b border-[#d9ded8] bg-[#f1f4f1] px-4 py-3 text-xs font-semibold uppercase tracking-normal text-[#4f5954]">
          <div>{t(locale, "mapping.uploadedColumn")}</div>
          <div>{t(locale, "mapping.flexibleRole")}</div>
          <div>{t(locale, "mapping.confidence")}</div>
          <div>{t(locale, "mapping.wideLabel")}</div>
          <div>{t(locale, "mapping.confirmation")}</div>
        </div>
        <div className="max-h-[560px] overflow-auto scrollbar-stable">
          {visibleMappings.map((mapping) => {
            const inference = inferences.find((item) => item.column === mapping.column);
            return (
              <MappingRow
                key={mapping.column}
                inference={inference}
                mapping={mapping}
                onChangeField={changeField}
                onChangeMapping={updateMapping}
              />
            );
          })}
        </div>
      </div>

      {!validation.canProceed && visibleMappings.length < mappings.length ? (
        <details className="rounded-lg border border-[#d9ded8] bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {t(locale, "mapping.showAuto", { count: mappings.length - visibleMappings.length })}
          </summary>
          <div className="mt-4 overflow-hidden rounded border border-[#d9ded8]">
            {mappings
              .filter((mapping) => !visibleMappings.some((visible) => visible.column === mapping.column))
              .map((mapping) => {
                const inference = inferences.find((item) => item.column === mapping.column);
                return (
                  <MappingRow
                    key={mapping.column}
                    inference={inference}
                    mapping={mapping}
                    onChangeField={changeField}
                    onChangeMapping={updateMapping}
                  />
                );
              })}
          </div>
        </details>
      ) : null}

      <DataPreview />
    </section>
  );
}

function MappingRow({
  inference,
  mapping,
  onChangeField,
  onChangeMapping,
}: {
  inference?: ColumnInference;
  mapping: ColumnMapping;
  onChangeField: (column: string, field: InternalField) => void;
  onChangeMapping: (column: string, patch: Partial<ColumnMapping>) => void;
}) {
  const { locale } = useAnalyticsStore();
  const needsConfirmation = mapping.field === "score" && mapping.confidence < 0.7 && !mapping.confirmed;

  return (
    <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_1fr] items-start gap-0 border-b border-[#eef1ed] px-4 py-3 text-sm last:border-b-0">
      <div className="pr-4">
        <div className="font-semibold">{mapping.column}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {inference?.samples.length ? (
            inference.samples.slice(0, 3).map((sample) => (
              <span key={sample} className="rounded bg-[#f1f4f1] px-2 py-1 text-xs text-[#4f5954]">
                {sample}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#707a74]">{t(locale, "mapping.noSample")}</span>
          )}
        </div>
        {inference?.ambiguous ? (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-[#775100]">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t(locale, "mapping.ambiguous")}
          </div>
        ) : null}
      </div>

      <div className="pr-4">
        <select
          className="w-full rounded border border-[#bec8c0] bg-white px-2 py-2 text-sm"
          value={mapping.field}
          onChange={(event) => onChangeField(mapping.column, event.target.value as InternalField)}
        >
          {internalFields.map((field) => (
            <option key={field} value={field}>
              {fieldLabel(field, locale)}
            </option>
          ))}
        </select>
        {inference?.candidates.length ? (
          <div className="mt-2 flex flex-col gap-1">
            {inference.candidates.slice(0, 3).map((candidate) => (
              <button
                key={`${candidate.mappedTo}-${candidate.confidence}`}
                className="inline-flex items-center gap-1 text-left text-xs text-[#2f69a1] hover:underline"
                type="button"
                onClick={() => onChangeField(mapping.column, candidate.mappedTo)}
              >
                <ArrowRight className="h-3 w-3" />
                {fieldLabel(candidate.mappedTo, locale)} | {formatPercent(candidate.confidence * 100, 0)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pr-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span>{formatPercent(mapping.confidence * 100, 0)}</span>
          {needsConfirmation ? <span className="text-[#775100]">{t(locale, "mapping.needsConfirmation")}</span> : null}
        </div>
        <div className="h-2 rounded bg-[#e6ebe5]">
          <div
            className={cn(
              "h-2 rounded",
              mapping.confidence >= 0.85 ? "bg-[#16726d]" : mapping.confidence >= 0.7 ? "bg-[#b8860b]" : "bg-[#c65d21]",
            )}
            style={{ width: `${Math.max(6, mapping.confidence * 100)}%` }}
          />
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-[#5b635f]">
          {mapping.evidence.slice(0, 2).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="pr-4">
        <select
          className="w-full rounded border border-[#bec8c0] bg-white px-2 py-2 text-sm disabled:bg-[#f1f4f1]"
          value={mapping.headerDerivation}
          disabled={mapping.field !== "score"}
          onChange={(event) =>
            onChangeMapping(mapping.column, {
              headerDerivation: event.target.value as HeaderDerivation,
              confirmed: false,
            })
          }
        >
          <option value="none">{locale === "mn" ? "Үгүй" : "None"}</option>
          <option value="category">{fieldLabel("category", locale)}</option>
          <option value="metric">{fieldLabel("metricLabel", locale)}</option>
          <option value="topic">{fieldLabel("topic", locale)}</option>
          <option value="assessment">{fieldLabel("assessment", locale)}</option>
          <option value="subject">{fieldLabel("subject", locale)}</option>
        </select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          className="h-4 w-4 accent-[#16726d]"
          type="checkbox"
          checked={mapping.confirmed}
          onChange={(event) => onChangeMapping(mapping.column, { confirmed: event.target.checked })}
        />
        {t(locale, "mapping.confirmed")}
      </label>
    </div>
  );
}

function MessageList({ tone, title, messages }: { tone: "danger" | "warning"; title: string; messages: string[] }) {
  return (
    <div
      className={cn(
        "rounded border p-3 text-sm",
        tone === "danger" ? "border-[#e2aaa1] bg-[#fae2de] text-[#8a2f24]" : "border-[#e5cf91] bg-[#fff8e1] text-[#775100]",
      )}
    >
      <div className="mb-1 font-semibold">{title}</div>
      <ul className="flex flex-col gap-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function DataPreview() {
  const { locale, parsedCsv } = useAnalyticsStore();
  if (!parsedCsv) {
    return null;
  }

  const rows = parsedCsv.rows.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-lg border border-[#d9ded8] bg-white">
      <div className="border-b border-[#d9ded8] bg-[#f1f4f1] px-4 py-3 text-sm font-semibold">{t(locale, "mapping.csvPreview")}</div>
      <div className="overflow-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr>
              {parsedCsv.columns.map((column) => (
                <th key={column} className="border-b border-[#eef1ed] px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {parsedCsv.columns.map((column) => (
                  <td key={column} className="max-w-[220px] truncate border-b border-[#f3f4f1] px-3 py-2">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
