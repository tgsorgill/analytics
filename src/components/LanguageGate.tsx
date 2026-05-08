"use client";

import { Globe2 } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { languageName, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function LanguageGate() {
  const { locale, localePromptOpen, setLocale } = useAnalyticsStore();

  if (!localePromptOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1014]/75 p-4 backdrop-blur-sm">
      <section className="scale-in w-[min(620px,100%)] overflow-hidden rounded-xl border border-[#d9ded8] bg-white shadow-2xl">
        <div className="border-b border-[#d9ded8] bg-[#f7faf7] p-5">
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
            <Globe2 className="h-4 w-4" />
            {t(locale, "language.saved")}
          </div>
          <h2 className="mt-3 text-3xl font-semibold">{t(locale, "language.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[#4f5954]">{t(locale, "language.subtitle")}</p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <LanguageChoice label="ENG" body={t("en", "language.eng")} locale="en" active={locale === "en"} onSelect={setLocale} />
          <LanguageChoice label="MN" body={t("mn", "language.mn")} locale="mn" active={locale === "mn"} onSelect={setLocale} />
        </div>
      </section>
    </div>
  );
}

function LanguageChoice({
  label,
  body,
  locale,
  active,
  onSelect,
}: {
  label: string;
  body: string;
  locale: Locale;
  active: boolean;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <button
      className={cn(
        "rounded-lg border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg",
        active ? "border-[#16726d] bg-[#eef8f5]" : "border-[#d9ded8] bg-white hover:bg-[#f7faf7]",
      )}
      type="button"
      onClick={() => onSelect(locale)}
    >
      <span className="text-xs font-semibold uppercase tracking-normal text-[#6b746f]">{languageName(locale)}</span>
      <span className="mt-2 block text-3xl font-semibold">{label}</span>
      <span className="mt-2 block text-sm text-[#4f5954]">{body}</span>
    </button>
  );
}
