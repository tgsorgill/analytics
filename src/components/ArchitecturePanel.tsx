"use client";

import { BookOpen, ServerOff } from "lucide-react";
import { architectureDoc } from "@/lib/architectureDoc";

export function ArchitecturePanel() {
  return (
    <section className="workspace-page reveal-up flex flex-col gap-5">
      <div className="metric-panel interactive-panel p-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <BookOpen className="h-4 w-4" />
          System Architecture
        </div>
        <h2 className="mt-3 text-3xl font-semibold">How the local-first analytics engine is built</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">
          This app keeps classroom files in the browser, uses deterministic local analytics for results, and limits AI to
          aggregate explanations.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-sm text-[#3f4642]">
          <ServerOff className="h-4 w-4 text-[#16726d]" />
          No database, no authentication, no server-side classroom storage.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {architectureDoc.sections.map((section) => (
          <article key={section.title} className="metric-panel interactive-panel p-5">
            <h3 className="mb-2 font-semibold">{section.title}</h3>
            <div className="flex flex-col gap-2 text-sm leading-6 text-[#3f4642]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
