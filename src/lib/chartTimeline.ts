import { localizeLabel, type Locale } from "@/lib/i18n";

type TimelinePoint = Record<string, unknown>;

export function buildTimelineSeries<T extends TimelinePoint>(
  points: T[],
  getLabel: (point: T) => string | undefined,
  locale: Locale,
) {
  const prepared = points.map((point) => {
    const rawLabel = String(getLabel(point) ?? "");
    const timestamp = parseTimelineDate(rawLabel);
    return {
      ...point,
      timelineLabel: localizeLabel(rawLabel, locale),
      timelineValue: timestamp ?? localizeLabel(rawLabel, locale),
      timelineTimestamp: timestamp,
    };
  });

  const timestamps = prepared.map((point) => point.timelineTimestamp).filter((value): value is number => Number.isFinite(value));
  const useTimeScale = prepared.length > 1 && timestamps.length === prepared.length && new Set(timestamps).size > 1;

  return {
    data: prepared.map((point) => ({
      ...point,
      timelineValue: useTimeScale ? point.timelineTimestamp : point.timelineLabel,
    })),
    useTimeScale,
  };
}

export function timelineTickFormatter(locale: Locale) {
  return (value: unknown) => {
    if (typeof value !== "number") {
      return String(value ?? "");
    }

    return new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  };
}

export function timelineTooltipLabel(locale: Locale) {
  return (value: unknown) => {
    if (typeof value !== "number") {
      return String(value ?? "");
    }

    return new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  };
}

function parseTimelineDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const iso = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) {
    return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const short = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (short) {
    const year = Number(short[3].length === 2 ? `20${short[3]}` : short[3]);
    return Date.UTC(year, Number(short[1]) - 1, Number(short[2]));
  }

  if (!/\b\d{4}\b/.test(trimmed)) {
    return null;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
