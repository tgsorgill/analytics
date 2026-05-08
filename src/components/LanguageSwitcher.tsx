"use client";

import { Globe2 } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { languageName, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useAnalyticsStore();
  const choices: Locale[] = ["en", "mn"];

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-[#bec8c0] bg-white p-1 shadow-sm">
      {!compact ? (
        <span className="inline-flex items-center gap-1 px-2 text-xs font-semibold uppercase tracking-normal text-[#5b635f]">
          <Globe2 className="h-3.5 w-3.5" />
          {t(locale, "language.switchLabel")}
        </span>
      ) : null}
      {choices.map((choice) => (
        <button
          key={choice}
          className={cn(
            "rounded px-2.5 py-1.5 text-xs font-semibold transition",
            choice === locale ? "bg-[#16726d] text-white" : "text-[#3f4642] hover:bg-[#f1f4f1]",
          )}
          type="button"
          onClick={() => setLocale(choice)}
        >
          {languageName(choice)}
        </button>
      ))}
    </div>
  );
}
