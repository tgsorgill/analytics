"use client";

import { BookOpen, ServerOff } from "lucide-react";
import { architectureDoc } from "@/lib/architectureDoc";
import { t } from "@/lib/i18n";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

export function ArchitecturePanel() {
  const { locale } = useAnalyticsStore();
  const sections = locale === "mn" ? architectureSectionsMn : architectureDoc.sections;

  return (
    <section className="workspace-page reveal-up flex flex-col gap-5">
      <div className="metric-panel interactive-panel p-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#0f5a55]">
          <BookOpen className="h-4 w-4" />
          {t(locale, "architecture.kicker")}
        </div>
        <h2 className="mt-3 text-3xl font-semibold">{t(locale, "architecture.title")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4f5954]">{t(locale, "architecture.body")}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded border border-[#d9ded8] bg-[#f7faf7] px-3 py-2 text-sm text-[#3f4642]">
          <ServerOff className="h-4 w-4 text-[#16726d]" />
          {t(locale, "architecture.badge")}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
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

const architectureSectionsMn = [
  {
    title: "1. Бүрэн системийн архитектур",
    body: [
      "Next.js App Router нь статик client bundle өгнө. CSV унших, schema таамаглах, зураглал, нэгтгэл, аналитик, дүрслэл, экспорт бүгд браузер дотор хийгдэнэ.",
      "AI нь зөвхөн нэгтгэсэн AnalyticsResult-ийн хязгаарлагдсан хэсгийг авч, багшид зориулсан ангийн аналитик туслах байдлаар ажиллана.",
    ],
  },
  {
    title: "2. Next.js хавтасны бүтэц",
    body: [
      "src/app нь статик shell болон global style, src/components нь upload, dashboard, Extra, export, formula, architecture UI-г агуулна.",
      "src/lib нь CSV, inference, normalization, analytics, prompt, Hugging Face, export, type-уудыг агуулна. src/workers нь хүнд тооцооллыг main thread-ээс салгана.",
    ],
  },
  {
    title: "3. CSV pipeline",
    body: ["PapaParse файл объектыг браузер дотор chunk-ээр уншина. Мөрүүд backend рүү илгээгдэхгүй, зөвхөн багшийн төхөөрөмж дээр боловсруулагдана."],
  },
  {
    title: "4. Schema inference",
    body: ["Багана бүр header keyword, тоон харьцаа, хувь, бутархай, огноо, давтагдал, текстийн шинжээр оноологдож, confidence болон нотолгоотой candidate үүсгэнэ."],
  },
  {
    title: "5. Зураглалын UI",
    body: ["Автомат тайлбар тодорхойгүй үед багш score эсвэл metric баганыг засаж баталгаажуулж болно. Ил тод confidence болон sample харагдана."],
  },
  {
    title: "6. Нэгтгэсэн өгөгдлийн загвар",
    body: ["Өгөгдөл NormalizedRecord хэлбэрт орно: optional student, subject, assessment, topic, maxScore, date болон заавал score талбар."],
  },
  {
    title: "7. Детерминистик аналитик",
    body: ["Дундаж, медиан, mode, стандарт хазайлт, хүчтэй/сул ангилал, эзэмшил, тархалт, чиг хандлага, варианс, кластер бүгд дотооддоо тооцоологдоно."],
  },
  {
    title: "8. Дүрслэлийн систем",
    body: ["Recharts нь bar, line, pie, distribution, cluster chart-уудыг frontend дээр render хийнэ. AI зураг эсвэл график үүсгэхгүй."],
  },
  {
    title: "9. Hugging Face AI",
    body: ["Hugging Face router chat-completions endpoint браузераас дуудагдана. Зөвхөн нэгтгэсэн, PII-гүй аналитик JSON илгээгдэнэ."],
  },
  {
    title: "10. Prompt builder",
    body: ["Prompt нь aggregate талбаруудыг whitelist хийж, labels-ийг sanitize хийж, хүүхэд үнэлэх, оношлох, шийдвэр гаргахыг хориглодог."],
  },
  {
    title: "11. Web Worker",
    body: ["Аналитик болон Extra-ийн хүнд тооцоолол worker дээр ажиллаж UI-г 10k+ мөр дээр ч хариу үйлдэлтэй байлгана."],
  },
  {
    title: "12. State management",
    body: ["Zustand нь ephemeral client state хадгална: parsed CSV, mappings, normalized records, analytics, AI output, workspace mode, locale."],
  },
  {
    title: "13. Экспорт",
    body: ["Backend persistence байхгүй тул normalized JSON, analytics JSON, AI summary, PDF report нь дотоод export хэлбэрээр persistence-ийг орлоно."],
  },
  {
    title: "14. Гүйцэтгэлийн стратеги",
    body: ["Chunked parsing, memoized chart data, Web Worker, on-demand Extra analytics нь том CSV дээр main thread блоклох эрсдэлийг багасгана."],
  },
  {
    title: "15. Edge case",
    body: ["Оноо/maxScore, хувь, decimal, proficiency label, огноо байхгүй, topic байхгүй, олон score багана, malformed CSV зэрэг нөхцөлийг warning-той боловсруулна."],
  },
  {
    title: "16. Нууцлал ба хамгаалалт",
    body: ["CSV cell display sanitize хийгдэж spreadsheet formula prefix саармагжина. AI raw row эсвэл хувь сурагчийн record авахгүй."],
  },
  {
    title: "17. Deploy стратеги",
    body: ["Апп статик hosting дээр ажиллана: Vercel, Netlify, Cloudflare Pages зэрэгт backendгүй deploy хийж болно."],
  },
  {
    title: "18. Production checklist",
    body: ["Fixture CSV, inference tests, normalization tests, analytics tests, accessibility, large-file performance, dependency audit-уудыг release өмнө шалгана."],
  },
];
