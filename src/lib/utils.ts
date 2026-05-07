import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function formatPercent(value?: number | null, places = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "n/a";
  }

  return `${round(value, places)}%`;
}

export function formatNumber(value?: number | null, places = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "n/a";
  }

  return `${round(value, places)}`;
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(filename, blob);
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(name: string, fallback = "education-analytics") {
  const clean = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return clean || fallback;
}
