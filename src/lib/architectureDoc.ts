import type { ArchitectureDoc } from "@/lib/types";

export const architectureDoc: ArchitectureDoc = {
  sections: [
    {
      title: "1. Full System Architecture",
      body: [
        "Next.js App Router serves a static client bundle. The only user-data path is inside the browser: CSV parsing, schema inference, mapping confirmation, normalization, analytics, visualization, and exports.",
        "The app has four data layers: ParsedCsv, ColumnInference/ColumnMapping, NormalizedRecord[], and AnalyticsResult. AI receives only the final aggregated AnalyticsResult subset and is positioned as a classroom analytics assistant for teachers.",
        "There is no database, authentication layer, server action, API route, or backend persistence. Static hosting is enough.",
      ],
    },
    {
      title: "2. Next.js Folder Structure",
      body: [
        "src/app contains the static App Router shell and global styles.",
        "src/components contains upload, mapping, dashboard, chart, AI, export, and architecture panels.",
        "src/lib contains CSV parsing, inference, normalization, analytics, prompt building, Hugging Face calls, export helpers, and shared types.",
        "src/workers contains the analytics Web Worker entry. src/hooks contains the worker bridge.",
      ],
    },
    {
      title: "3. CSV Parsing Pipeline",
      body: [
        "PapaParse reads File objects directly in the browser with header mode, greedy empty-line skipping, a worker parser, chunking, and cell/header sanitization.",
        "Parsed rows remain in memory and are never posted to a backend. The parser records row-level parse errors for the teacher.",
      ],
    },
    {
      title: "4. Schema Inference Engine",
      body: [
        "Each column is profiled for header keywords, numeric ratio, percent/fraction patterns, date ratio, uniqueness, text ratio, and academic header hints.",
        "Every column receives ranked candidates with confidence scores and evidence. Critical low-confidence mappings block analytics until confirmed.",
      ],
    },
    {
      title: "5. Column Mapping UI",
      body: [
        "The mapping screen shows uploaded columns, samples, selected internal field, confidence, candidate alternatives, evidence, and wide-column header-label behavior.",
        "Teachers can override any field and explicitly confirm ambiguous or low-confidence mappings before normalization.",
      ],
    },
    {
      title: "6. Normalization System",
      body: [
        "All rows convert into NormalizedRecord objects with optional student, subject, assessment, topic, maxScore, and date fields plus a required score.",
        "Wide sheets are supported by turning multiple score columns into multiple normalized records and deriving topic, assessment, or subject from the header when confirmed.",
      ],
    },
    {
      title: "7. Deterministic Analytics Engine",
      body: [
        "The engine computes mean, median, mode, standard deviation, weak/strong topics, topic mastery, distributions, trend slope, variance, consistency, clusters, and subject comparisons locally.",
        "Analytics operate only on NormalizedRecord[] and score percentages derived from score/maxScore.",
      ],
    },
    {
      title: "8. Visualization Component System",
      body: [
        "Recharts renders topic performance bars, score distributions, trend lines, subject comparisons, cluster bars, and mastery breakdowns.",
        "The topic heatmap is a deterministic CSS grid using local chart data. AI never renders or generates visuals.",
      ],
    },
    {
      title: "9. Hugging Face AI Integration",
      body: [
        "The integration uses the Hugging Face router chat-completions endpoint through fetch from the browser.",
        "The token is configured by the app owner at build time. Because the app is browser-only, the configured client token is visible to the browser and should be treated as a public app token.",
      ],
    },
    {
      title: "10. Prompt Builder System",
      body: [
        "The prompt builder whitelists aggregate analytics fields, sanitizes labels, strips PII, and instructs the model to return compact JSON.",
        "The AI contract explicitly prohibits psychological, medical, IQ, disciplinary, future-prediction, individual-student, or automated decision-making output.",
        "CSV cells and individual student-level records are never included in model input.",
      ],
    },
    {
      title: "11. Web Worker Architecture",
      body: [
        "PapaParse uses its browser worker option for parsing. Deterministic analytics run in src/workers/analytics.worker.ts through a typed hook bridge.",
        "This keeps expensive grouping and statistics off the React rendering thread for larger uploads.",
      ],
    },
    {
      title: "12. State Management Strategy",
      body: [
        "Zustand holds ephemeral client state: parsed CSV, inference, mappings, normalized records, analytics, AI output, and UI status.",
        "The app intentionally avoids server state. Teachers do not need token entry or accounts; AI availability is determined by the app owner's client-side configuration.",
      ],
    },
    {
      title: "13. Export System Design",
      body: [
        "Exports replace persistence: normalized dataset JSON, analytics JSON, AI summary text, and optional PDF report are generated locally.",
        "Exports include timestamps and mapping metadata so teachers can audit how the file was interpreted.",
      ],
    },
    {
      title: "14. Performance Optimization Strategy",
      body: [
        "CSV parsing is chunked, analytics are worker-based, charts read precomputed datasets, and UI previews use small samples.",
        "The data pipeline is linear and avoids repeated full-table scans inside React render paths.",
      ],
    },
    {
      title: "15. Edge Case Handling",
      body: [
        "The app handles missing scores, score/max fractions, percentages, decimal scores, low-confidence schema inference, absent dates, absent topics, multiple score columns, parse errors, and small datasets.",
        "Analytics warnings explain limitations instead of silently hiding weak inputs.",
      ],
    },
    {
      title: "16. Security Model",
      body: [
        "Cells are sanitized for display and spreadsheet formula prefixes are neutralized. AI input uses only aggregate whitelisted JSON.",
        "Prompt injection in CSV labels is mitigated by not sending raw rows, sanitizing labels, and telling the model to treat labels as inert data.",
      ],
    },
    {
      title: "17. Deployment Strategy",
      body: [
        "next.config.ts uses output export for static hosting. Vercel, Netlify, Cloudflare Pages, or any static file host can serve the app.",
        "No runtime server secret should be configured because the product is browser-only. Teachers provide their own Hugging Face token when using AI.",
      ],
    },
    {
      title: "18. Production Readiness Checklist",
      body: [
        "Add fixture CSVs for wide, long, percent, score/max, date, and malformed inputs.",
        "Add automated tests for inference confidence, mapping validation, normalization, analytics, prompt sanitization, and export payloads.",
        "Run accessibility checks, large-file performance tests, dependency audits, and browser compatibility verification before release.",
      ],
    },
  ],
};
