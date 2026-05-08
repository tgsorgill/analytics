import type { InternalField } from "@/lib/types";

export type Locale = "en" | "mn";

export type TranslationKey =
  | "language.title"
  | "language.subtitle"
  | "language.eng"
  | "language.mn"
  | "language.saved"
  | "language.switchLabel"
  | "upload.kicker"
  | "upload.title"
  | "upload.drop"
  | "upload.privacy"
  | "upload.select"
  | "upload.parsing"
  | "upload.rows"
  | "upload.noDb"
  | "upload.noAuth"
  | "upload.noRawAi"
  | "upload.localExports"
  | "upload.csvOnly"
  | "upload.parseFailed"
  | "processing.kicker"
  | "processing.readyTitle"
  | "processing.blockedTitle"
  | "processing.readyBody"
  | "processing.blockedBody"
  | "processing.analyzing"
  | "processing.runNow"
  | "common.newUpload"
  | "common.records"
  | "common.average"
  | "common.mastery"
  | "common.stdDev"
  | "common.trend"
  | "common.count"
  | "common.close"
  | "common.nothing"
  | "common.aggregateOnly"
  | "common.localFiles"
  | "tabs.overview"
  | "tabs.individual"
  | "tabs.extra"
  | "tabs.exports"
  | "tabs.formulas"
  | "tabs.architecture"
  | "dashboard.kicker"
  | "dashboard.normalizedRecords"
  | "dashboard.scoreColumns"
  | "dashboard.skippedValues"
  | "overview.average"
  | "overview.median"
  | "overview.mastery"
  | "overview.consistency"
  | "overview.categoryPerformance"
  | "overview.masteryBreakdown"
  | "overview.scoreDistribution"
  | "overview.trendOverTime"
  | "overview.subjectComparisons"
  | "overview.performanceClusters"
  | "overview.categoryHeatmap"
  | "overview.averageScore"
  | "overview.noDateMapping"
  | "overview.noSubjectMapping"
  | "individual.kicker"
  | "individual.title"
  | "individual.body"
  | "individual.safety"
  | "individual.emptyTitle"
  | "individual.emptyBody"
  | "individual.students"
  | "individual.filtered"
  | "individual.find"
  | "individual.search"
  | "individual.searchPlaceholder"
  | "individual.subject"
  | "individual.category"
  | "individual.performanceBand"
  | "individual.trendFilter"
  | "individual.all"
  | "individual.profile"
  | "individual.lowHigh"
  | "individual.progression"
  | "individual.distribution"
  | "individual.noTrend"
  | "individual.strongest"
  | "individual.watch"
  | "individual.coverage"
  | "individual.recentRecords"
  | "individual.date"
  | "individual.assessment"
  | "individual.score"
  | "trend.kicker"
  | "trend.title"
  | "trend.needData"
  | "trend.overall"
  | "trend.noSignal"
  | "trend.earlierToLatest"
  | "trend.uploadMore"
  | "trend.note"
  | "trend.improvingCategories"
  | "trend.decliningCategories"
  | "trend.empty"
  | "exports.kicker"
  | "exports.title"
  | "exports.body"
  | "exports.overviewTitle"
  | "exports.overviewBody"
  | "exports.extraTitle"
  | "exports.extraBody"
  | "exports.advanced"
  | "exports.normalizedJson"
  | "exports.analyticsJson"
  | "exports.aiSummary"
  | "exports.pdfReport"
  | "exports.extraNormalizedJson"
  | "exports.extraAnalyticsJson"
  | "exports.extraAiSummary"
  | "exports.extraPdfReport"
  | "exports.preparingJson"
  | "exports.preparingAi"
  | "exports.preparingPdf"
  | "exports.package"
  | "exports.sourceRows"
  | "exports.normalizedRecords"
  | "exports.skippedValues"
  | "ai.title"
  | "ai.configured"
  | "ai.notConfigured"
  | "ai.model"
  | "ai.generating"
  | "ai.generate"
  | "ai.trends"
  | "ai.focus"
  | "ai.cautions"
  | "ai.visualGuidance"
  | "ai.failed"
  | "ai.unavailable"
  | "extra.loadingTitle"
  | "extra.kicker"
  | "extra.title"
  | "extra.body"
  | "extra.records"
  | "extra.imbalance"
  | "extra.instability"
  | "extra.dimensionLens"
  | "extra.allDimensions"
  | "extra.strongLinks"
  | "extra.coverageFlags"
  | "extra.anomalies"
  | "extra.archetypes"
  | "extra.relationships"
  | "extra.coverage"
  | "extra.progression"
  | "extra.archetypesModule"
  | "extra.assessment"
  | "extra.patterns"
  | "extra.profile"
  | "extra.fullscreen"
  | "extra.correlationMatrix"
  | "extra.relationshipMap"
  | "extra.coverageShare"
  | "extra.earlier"
  | "extra.movement"
  | "extra.latest"
  | "extra.assessmentCol"
  | "extra.variance"
  | "extra.diversity"
  | "extra.flags"
  | "extra.balanced"
  | "extra.same"
  | "extra.selfComparison"
  | "extra.aiBrief"
  | "extra.aiPreparing"
  | "extra.aiSafety"
  | "mapping.kicker"
  | "mapping.reviewTitle"
  | "mapping.chooseScoreTitle"
  | "mapping.headerDetected"
  | "mapping.ready"
  | "mapping.confirmationsNeeded"
  | "mapping.parseWarnings"
  | "mapping.blocked"
  | "mapping.warnings"
  | "mapping.structureNotes"
  | "mapping.uploadedColumn"
  | "mapping.flexibleRole"
  | "mapping.confidence"
  | "mapping.wideLabel"
  | "mapping.confirmation"
  | "mapping.noSample"
  | "mapping.ambiguous"
  | "mapping.needsConfirmation"
  | "mapping.confirmed"
  | "mapping.run"
  | "mapping.use"
  | "mapping.showAuto"
  | "mapping.csvPreview"
  | "formulas.kicker"
  | "formulas.title"
  | "formulas.body"
  | "formulas.extraKicker"
  | "formulas.extraTitle"
  | "formulas.extraBody"
  | "formulas.snapshot"
  | "architecture.kicker"
  | "architecture.title"
  | "architecture.body"
  | "architecture.badge";

const translations: Record<TranslationKey, string> = {
  "language.title": "Choose your workspace language",
  "language.subtitle": "Your choice is saved in this browser. You can switch later from the app header.",
  "language.eng": "English",
  "language.mn": "Монгол",
  "language.saved": "Saved locally",
  "language.switchLabel": "Language",
  "upload.kicker": "Local-first classroom analytics",
  "upload.title": "Upload school CSVs and inspect classroom-level analytics.",
  "upload.drop": "Drop a CSV file or browse",
  "upload.privacy": "Rows stay in browser memory. The app only asks for mapping help when the score column is unclear.",
  "upload.select": "Select CSV",
  "upload.parsing": "Parsing and interpreting CSV",
  "upload.rows": "rows",
  "upload.noDb": "No database",
  "upload.noAuth": "No authentication",
  "upload.noRawAi": "No raw CSV to AI",
  "upload.localExports": "Local exports",
  "upload.csvOnly": "Upload a CSV file.",
  "upload.parseFailed": "CSV parsing failed.",
  "processing.kicker": "Automatic interpretation",
  "processing.readyTitle": "Preparing deterministic analytics.",
  "processing.blockedTitle": "No score or metric column was found.",
  "processing.readyBody": "The app interpreted the column headers automatically and is running local calculations.",
  "processing.blockedBody": "Try a CSV with at least one score-like column such as percentage, points earned, grade, average, rating, or proficiency.",
  "processing.analyzing": "Analyzing",
  "processing.runNow": "Run now",
  "common.newUpload": "New upload",
  "common.records": "Records",
  "common.average": "Average",
  "common.mastery": "Mastery",
  "common.stdDev": "Std dev",
  "common.trend": "Trend",
  "common.count": "Count",
  "common.close": "Close",
  "common.nothing": "Nothing to see here :p",
  "common.aggregateOnly": "Aggregate only",
  "common.localFiles": "Local files",
  "tabs.overview": "Overview",
  "tabs.individual": "Individual",
  "tabs.extra": "Extra",
  "tabs.exports": "Exports",
  "tabs.formulas": "Formulas",
  "tabs.architecture": "Architecture",
  "dashboard.kicker": "Analytics dashboard",
  "dashboard.normalizedRecords": "normalized records",
  "dashboard.scoreColumns": "score column(s)",
  "dashboard.skippedValues": "skipped values",
  "overview.average": "Average",
  "overview.median": "Median",
  "overview.mastery": "Mastery",
  "overview.consistency": "Consistency",
  "overview.categoryPerformance": "Category Performance",
  "overview.masteryBreakdown": "Mastery Breakdown",
  "overview.scoreDistribution": "Score Distribution",
  "overview.trendOverTime": "Trend Over Time",
  "overview.subjectComparisons": "Subject Comparisons",
  "overview.performanceClusters": "Performance Clusters",
  "overview.categoryHeatmap": "Category Heatmap",
  "overview.averageScore": "Average score",
  "overview.noDateMapping": "No date mapping",
  "overview.noSubjectMapping": "No subject mapping",
  "individual.kicker": "Individual analytics",
  "individual.title": "Student-level deterministic coverage",
  "individual.body": "Search, filter, and inspect each mapped student using local calculations only. This view helps teachers review score patterns, coverage, and movement without AI judging individual learners.",
  "individual.safety": "Deterministic classroom records only. No AI individual analysis, ranking, diagnosis, or prediction.",
  "individual.emptyTitle": "No student identifiers were mapped.",
  "individual.emptyBody": "Upload a CSV with a student name or student ID column to unlock individual statistics. Analytics still work at the classroom level without student labels.",
  "individual.students": "Students",
  "individual.filtered": "Visible",
  "individual.find": "Find students",
  "individual.search": "Search",
  "individual.searchPlaceholder": "Name, ID, subject, or term",
  "individual.subject": "Subject",
  "individual.category": "Category",
  "individual.performanceBand": "Performance band",
  "individual.trendFilter": "Trend",
  "individual.all": "All",
  "individual.profile": "Student profile",
  "individual.lowHigh": "Low / high",
  "individual.progression": "Progression",
  "individual.distribution": "Score distribution",
  "individual.noTrend": "Not enough repeated records to show progression yet.",
  "individual.strongest": "Strongest coverage",
  "individual.watch": "Watch areas",
  "individual.coverage": "Coverage depth",
  "individual.recentRecords": "Recent records",
  "individual.date": "Date",
  "individual.assessment": "Assessment",
  "individual.score": "Score",
  "trend.kicker": "Trend Intelligence",
  "trend.title": "Past-to-present movement",
  "trend.needData": "Needs at least two time or order segments",
  "trend.overall": "Overall movement",
  "trend.noSignal": "No signal",
  "trend.earlierToLatest": "earlier to latest",
  "trend.uploadMore": "Upload another dated or ordered dataset to compare movement.",
  "trend.note": "Trend movement compares the earliest available period against the latest. When dates are missing, the app uses upload-order segments and reports that limitation.",
  "trend.improvingCategories": "Improving categories",
  "trend.decliningCategories": "Declining categories",
  "trend.empty": "No category improvement or decline trend yet. Add dated records, repeated assessments, or ordered uploads to unlock category-level movement.",
  "exports.kicker": "Exports",
  "exports.title": "Download local reports and datasets",
  "exports.body": "Exports replace backend persistence: download normalized records, deterministic analytics, AI summaries, and polished PDF reports without storing classroom data on a server.",
  "exports.overviewTitle": "Overview exports",
  "exports.overviewBody": "Download the normalized dataset, computed analytics, AI summary, or complete PDF report for the main dashboard.",
  "exports.extraTitle": "Extra exports",
  "exports.extraBody": "Package the advanced workspace outputs. Extra analytics compute locally on demand when they are not already cached.",
  "exports.advanced": "Advanced",
  "exports.normalizedJson": "Normalized JSON",
  "exports.analyticsJson": "Analytics JSON",
  "exports.aiSummary": "AI Summary",
  "exports.pdfReport": "PDF Report",
  "exports.extraNormalizedJson": "Extra Normalized JSON",
  "exports.extraAnalyticsJson": "Extra Analytics JSON",
  "exports.extraAiSummary": "Extra AI Summary",
  "exports.extraPdfReport": "Extra PDF Report",
  "exports.preparingJson": "Preparing JSON",
  "exports.preparingAi": "Preparing AI",
  "exports.preparingPdf": "Preparing PDF",
  "exports.package": "Current dataset package",
  "exports.sourceRows": "Source rows",
  "exports.normalizedRecords": "Normalized records",
  "exports.skippedValues": "Skipped values",
  "ai.title": "Classroom Assistant",
  "ai.configured": "AI is configured for this app. Only aggregate analytics are sent for explanation.",
  "ai.notConfigured": "AI is not configured for this build. Set NEXT_PUBLIC_HF_TOKEN for the app owner build.",
  "ai.model": "Model",
  "ai.generating": "Generating",
  "ai.generate": "Generate summary",
  "ai.trends": "Trends",
  "ai.focus": "Instructional Focus",
  "ai.cautions": "Cautions",
  "ai.visualGuidance": "AI Visual Guidance",
  "ai.failed": "AI summary failed.",
  "ai.unavailable": "AI summary was unavailable for this run. Deterministic charts and exports are still available.",
  "extra.loadingTitle": "Building advanced classroom intelligence.",
  "extra.kicker": "Extra Advanced Intelligence",
  "extra.title": "Deep classroom performance layer",
  "extra.body": "Relationship maps, curriculum coverage, volatility, assessment signals, and anonymous cohort archetypes. Statistical relationships only. No causation or child evaluation.",
  "extra.records": "Records",
  "extra.imbalance": "Imbalance",
  "extra.instability": "Instability",
  "extra.dimensionLens": "Dimension lens",
  "extra.allDimensions": "All dimensions",
  "extra.strongLinks": "Strong links",
  "extra.coverageFlags": "Coverage flags",
  "extra.anomalies": "Anomalies",
  "extra.archetypes": "Archetypes",
  "extra.relationships": "Relationship Intelligence",
  "extra.coverage": "Curriculum Coverage",
  "extra.progression": "Progression Momentum",
  "extra.archetypesModule": "Anonymous Cohort Archetypes",
  "extra.assessment": "Assessment Intelligence",
  "extra.patterns": "Pattern Signals",
  "extra.profile": "Intelligence Profile",
  "extra.fullscreen": "Open fullscreen",
  "extra.correlationMatrix": "Correlation matrix",
  "extra.relationshipMap": "Relationship map",
  "extra.coverageShare": "Coverage share",
  "extra.earlier": "Earlier",
  "extra.movement": "Movement",
  "extra.latest": "Latest",
  "extra.assessmentCol": "Assessment",
  "extra.variance": "Variance",
  "extra.diversity": "Diversity",
  "extra.flags": "Flags",
  "extra.balanced": "balanced",
  "extra.same": "same",
  "extra.selfComparison": "compared with itself. Always 1.00 by definition.",
  "extra.aiBrief": "Extra AI Brief",
  "extra.aiPreparing": "Preparing an aggregate-only advanced interpretation.",
  "extra.aiSafety": "Statistical relationships only. No causation, diagnosis, discipline, or student ranking.",
  "mapping.kicker": "Mapping help",
  "mapping.reviewTitle": "Review the automatic interpretation.",
  "mapping.chooseScoreTitle": "Choose the score or metric column.",
  "mapping.headerDetected": "Header row {row} detected with {confidence}% confidence",
  "mapping.ready": "Ready for analytics",
  "mapping.confirmationsNeeded": "{count} confirmations needed",
  "mapping.parseWarnings": "{count} parse warnings",
  "mapping.blocked": "Blocked",
  "mapping.warnings": "Warnings",
  "mapping.structureNotes": "CSV structure notes",
  "mapping.uploadedColumn": "Uploaded column",
  "mapping.flexibleRole": "Flexible role",
  "mapping.confidence": "Confidence",
  "mapping.wideLabel": "Wide-column label",
  "mapping.confirmation": "Confirmation",
  "mapping.noSample": "No sample",
  "mapping.ambiguous": "Ambiguous",
  "mapping.needsConfirmation": "Needs confirmation",
  "mapping.confirmed": "Confirmed",
  "mapping.run": "Run analytics",
  "mapping.use": "Use this mapping",
  "mapping.showAuto": "Show {count} automatically interpreted column(s)",
  "mapping.csvPreview": "CSV preview",
  "formulas.kicker": "Formula reference",
  "formulas.title": "How the dashboard calculates results",
  "formulas.body": "These formulas explain the deterministic analytics. AI only explains these aggregate findings; it does not compute grades or evaluate students.",
  "formulas.extraKicker": "Extra formula guide",
  "formulas.extraTitle": "What every Extra module means",
  "formulas.extraBody": "Extra modules are advanced statistical signals for classroom review. They show relationships, balance, volatility, and coverage without making causal claims.",
  "formulas.snapshot": "Current Dataset Snapshot",
  "architecture.kicker": "System architecture",
  "architecture.title": "How the local-first analytics engine is built",
  "architecture.body": "This architecture page documents the browser-only pipeline, privacy model, AI boundaries, workers, exports, and deployment strategy.",
  "architecture.badge": "No database, no auth, no backend storage",
};

const mn: Partial<Record<TranslationKey, string>> = {
  "language.title": "Ажлын талбарын хэлээ сонгоно уу",
  "language.subtitle": "Сонголт энэ браузерт хадгалагдана. Дараа нь аппын дээд хэсгээс сольж болно.",
  "language.eng": "English",
  "language.mn": "Монгол",
  "language.saved": "Дотоодод хадгалсан",
  "language.switchLabel": "Хэл",
  "upload.kicker": "Дотоод-first ангийн аналитик",
  "upload.title": "Сургуулийн CSV файлаа оруулаад ангийн түвшний аналитикаа харна уу.",
  "upload.drop": "CSV файлаа чирж оруулах эсвэл сонгох",
  "upload.privacy": "Мөрүүд зөвхөн браузерын санах ойд байна. Онооны багана тодорхойгүй үед л зураглалын тусламж асууна.",
  "upload.select": "CSV сонгох",
  "upload.parsing": "CSV уншиж, тайлбарлаж байна",
  "upload.rows": "мөр",
  "upload.noDb": "Өгөгдлийн сангүй",
  "upload.noAuth": "Нэвтрэлтгүй",
  "upload.noRawAi": "Түүхий CSV AI руу явахгүй",
  "upload.localExports": "Дотоод экспорт",
  "upload.csvOnly": "CSV файл оруулна уу.",
  "upload.parseFailed": "CSV уншиж чадсангүй.",
  "processing.kicker": "Автомат тайлбарлалт",
  "processing.readyTitle": "Детерминистик аналитикийг бэлдэж байна.",
  "processing.blockedTitle": "Оноо эсвэл хэмжүүрийн багана олдсонгүй.",
  "processing.readyBody": "Апп баганын гарчгийг автоматаар тайлбарлаж, дотоод тооцоолол хийж байна.",
  "processing.blockedBody": "Хувь, авсан оноо, дүн, дундаж, үнэлгээ, чадварын түвшин зэрэг оноо шиг баганатай CSV оруулна уу.",
  "processing.analyzing": "Шинжилж байна",
  "processing.runNow": "Одоо ажиллуулах",
  "common.newUpload": "Шинэ файл",
  "common.records": "Рекорд",
  "common.average": "Дундаж",
  "common.mastery": "Эзэмшил",
  "common.stdDev": "Ст. хазайлт",
  "common.trend": "Чиг хандлага",
  "common.count": "Тоо",
  "common.close": "Хаах",
  "common.nothing": "Одоогоор харах зүйл алга :p",
  "common.aggregateOnly": "Зөвхөн нэгтгэл",
  "common.localFiles": "Дотоод файл",
  "tabs.overview": "Тойм",
  "tabs.individual": "Хувь хүн",
  "tabs.extra": "Extra",
  "tabs.exports": "Экспорт",
  "tabs.formulas": "Томьёо",
  "tabs.architecture": "Архитектур",
  "dashboard.kicker": "Аналитик самбар",
  "dashboard.normalizedRecords": "нэгтгэсэн рекорд",
  "dashboard.scoreColumns": "онооны багана",
  "dashboard.skippedValues": "алгассан утга",
  "overview.average": "Дундаж",
  "overview.median": "Медиан",
  "overview.mastery": "Эзэмшил",
  "overview.consistency": "Тогтвортой байдал",
  "overview.categoryPerformance": "Ангиллын гүйцэтгэл",
  "overview.masteryBreakdown": "Эзэмшлийн задаргаа",
  "overview.scoreDistribution": "Онооны тархалт",
  "overview.trendOverTime": "Хугацааны чиг хандлага",
  "overview.subjectComparisons": "Хичээлийн харьцуулалт",
  "overview.performanceClusters": "Гүйцэтгэлийн бүлгүүд",
  "overview.categoryHeatmap": "Ангиллын дулааны зураг",
  "overview.averageScore": "Дундаж оноо",
  "overview.noDateMapping": "Огнооны зураглал алга",
  "overview.noSubjectMapping": "Хичээлийн зураглал алга",
  "individual.kicker": "Хувь хүний аналитик",
  "individual.title": "Сурагч бүрийн детерминистик хамралт",
  "individual.body": "Сурагч бүрийг хайж, шүүж, зөвхөн дотоод тооцооллоор онооны хэв маяг, хамралт, хөдөлгөөнийг харна. AI хувь сурагчийг үнэлэхгүй.",
  "individual.safety": "Зөвхөн детерминистик рекорд. AI хувь хүний шинжилгээ, зэрэглэл, онош, таамаглал хийхгүй.",
  "individual.emptyTitle": "Сурагчийн нэр эсвэл ID зураглагдаагүй байна.",
  "individual.emptyBody": "Хувь хүний статистик нээхийн тулд сурагчийн нэр эсвэл ID баганатай CSV оруулна уу. Сурагчийн шошгогүй үед ангийн түвшний аналитик хэвээр ажиллана.",
  "individual.students": "Сурагчид",
  "individual.filtered": "Харагдаж буй",
  "individual.find": "Сурагч хайх",
  "individual.search": "Хайлт",
  "individual.searchPlaceholder": "Нэр, ID, хичээл эсвэл улирал",
  "individual.subject": "Хичээл",
  "individual.category": "Ангилал",
  "individual.performanceBand": "Гүйцэтгэлийн бүс",
  "individual.trendFilter": "Чиг хандлага",
  "individual.all": "Бүгд",
  "individual.profile": "Сурагчийн профайл",
  "individual.lowHigh": "Доод / дээд",
  "individual.progression": "Ахиц",
  "individual.distribution": "Онооны тархалт",
  "individual.noTrend": "Ахиц харуулах давтагдсан рекорд хангалтгүй байна.",
  "individual.strongest": "Хүчтэй хамралт",
  "individual.watch": "Анхаарах хэсэг",
  "individual.coverage": "Хамралтын гүн",
  "individual.recentRecords": "Сүүлийн рекордууд",
  "individual.date": "Огноо",
  "individual.assessment": "Үнэлгээ",
  "individual.score": "Оноо",
  "trend.kicker": "Чиг хандлагын аналитик",
  "trend.title": "Өмнөхөөс одоог хүртэлх хөдөлгөөн",
  "trend.needData": "Дор хаяж хоёр хугацаа эсвэл дарааллын хэсэг хэрэгтэй",
  "trend.overall": "Нийт хөдөлгөөн",
  "trend.noSignal": "Дохио алга",
  "trend.earlierToLatest": "өмнөхөөс сүүлийнх хүртэл",
  "trend.uploadMore": "Хөдөлгөөнийг харьцуулахын тулд огноотой эсвэл дараалалтай өгөгдөл оруулна уу.",
  "trend.note": "Чиг хандлага хамгийн эхний боломжит үеийг хамгийн сүүлийн үетэй харьцуулна. Огноо байхгүй бол апп оруулсан дарааллын хэсгийг ашиглаж, энэ хязгаарлалтыг тэмдэглэнэ.",
  "trend.improvingCategories": "Сайжирч буй ангиллууд",
  "trend.decliningCategories": "Буурч буй ангиллууд",
  "trend.empty": "Ангиллын сайжрал эсвэл бууралтын чиг хандлага одоогоор алга. Огноотой рекорд, давтагдсан шалгалт эсвэл дараалалтай өгөгдөл нэмнэ үү.",
  "exports.kicker": "Экспорт",
  "exports.title": "Дотоод тайлан болон өгөгдлөө татах",
  "exports.body": "Экспорт нь backend хадгалалтыг орлоно: сервер дээр ангийн өгөгдөл хадгалахгүйгээр нэгтгэсэн рекорд, детерминистик аналитик, AI хураангуй, PDF тайлан татна.",
  "exports.overviewTitle": "Тоймын экспорт",
  "exports.overviewBody": "Үндсэн самбарын нэгтгэсэн өгөгдөл, тооцоолсон аналитик, AI хураангуй эсвэл бүрэн PDF тайланг татна.",
  "exports.extraTitle": "Extra экспорт",
  "exports.extraBody": "Дэвшилтэт ажлын талбарын үр дүнг багцална. Extra аналитик кэшлэгдээгүй бол дотооддоо тооцоологдоно.",
  "exports.advanced": "Дэвшилтэт",
  "exports.normalizedJson": "Нэгтгэсэн JSON",
  "exports.analyticsJson": "Аналитик JSON",
  "exports.aiSummary": "AI хураангуй",
  "exports.pdfReport": "PDF тайлан",
  "exports.extraNormalizedJson": "Extra нэгтгэсэн JSON",
  "exports.extraAnalyticsJson": "Extra аналитик JSON",
  "exports.extraAiSummary": "Extra AI хураангуй",
  "exports.extraPdfReport": "Extra PDF тайлан",
  "exports.preparingJson": "JSON бэлдэж байна",
  "exports.preparingAi": "AI бэлдэж байна",
  "exports.preparingPdf": "PDF бэлдэж байна",
  "exports.package": "Одоогийн өгөгдлийн багц",
  "exports.sourceRows": "Эх мөрүүд",
  "exports.normalizedRecords": "Нэгтгэсэн рекорд",
  "exports.skippedValues": "Алгассан утга",
  "ai.title": "Ангийн туслах",
  "ai.configured": "Энэ аппд AI тохируулагдсан. Зөвхөн нэгтгэсэн аналитик тайлбарлуулах зорилгоор илгээгдэнэ.",
  "ai.notConfigured": "Энэ build-д AI тохируулагдаагүй. Апп эзэмшигч NEXT_PUBLIC_HF_TOKEN тохируулна.",
  "ai.model": "Модель",
  "ai.generating": "Үүсгэж байна",
  "ai.generate": "Хураангуй үүсгэх",
  "ai.trends": "Чиг хандлага",
  "ai.focus": "Заахад анхаарах зүйл",
  "ai.cautions": "Анхааруулга",
  "ai.visualGuidance": "AI дүрслэлийн зөвлөмж",
  "ai.failed": "AI хураангуй амжилтгүй боллоо.",
  "ai.unavailable": "Энэ удаад AI хураангуй боломжгүй байна. Детерминистик график болон экспорт хэвээр ажиллана.",
  "extra.loadingTitle": "Дэвшилтэт ангийн аналитик бэлдэж байна.",
  "extra.kicker": "Extra дэвшилтэт аналитик",
  "extra.title": "Ангийн гүйцэтгэлийн гүн давхарга",
  "extra.body": "Хамаарлын зураглал, сургалтын хөтөлбөрийн хамралт, хэлбэлзэл, үнэлгээний дохио, нэргүй cohort хэв шинж. Зөвхөн статистик хамаарал. Шалтгаан эсвэл хүүхдийн үнэлгээ биш.",
  "extra.records": "Рекорд",
  "extra.imbalance": "Тэнцвэргүй",
  "extra.instability": "Тогтворгүй",
  "extra.dimensionLens": "Хэмжээсийн линз",
  "extra.allDimensions": "Бүх хэмжээс",
  "extra.strongLinks": "Хүчтэй холбоо",
  "extra.coverageFlags": "Хамралтын дохио",
  "extra.anomalies": "Гаж дохио",
  "extra.archetypes": "Хэв шинж",
  "extra.relationships": "Хамаарлын аналитик",
  "extra.coverage": "Хөтөлбөрийн хамралт",
  "extra.progression": "Ахицын хөдөлгөөн",
  "extra.archetypesModule": "Нэргүй cohort хэв шинж",
  "extra.assessment": "Үнэлгээний аналитик",
  "extra.patterns": "Загварын дохио",
  "extra.profile": "Аналитик профайл",
  "extra.fullscreen": "Дэлгэц дүүрэн нээх",
  "extra.correlationMatrix": "Корреляцийн матриц",
  "extra.relationshipMap": "Хамаарлын зураг",
  "extra.coverageShare": "Хамралтын хувь",
  "extra.earlier": "Өмнөх",
  "extra.movement": "Хөдөлгөөн",
  "extra.latest": "Сүүлийн",
  "extra.assessmentCol": "Үнэлгээ",
  "extra.variance": "Варианс",
  "extra.diversity": "Олон янз байдал",
  "extra.flags": "Дохио",
  "extra.balanced": "тэнцвэртэй",
  "extra.same": "ижил",
  "extra.selfComparison": "өөртэй нь харьцуулсан. Тодорхойлолтоор үргэлж 1.00.",
  "extra.aiBrief": "Extra AI товч тайлбар",
  "extra.aiPreparing": "Зөвхөн нэгтгэлд суурилсан дэвшилтэт тайлбарыг бэлдэж байна.",
  "extra.aiSafety": "Зөвхөн статистик хамаарал. Шалтгаан, онош, сахилга, сурагчийн зэрэглэл биш.",
  "mapping.kicker": "Зураглалын тусламж",
  "mapping.reviewTitle": "Автомат тайлбарыг шалгана уу.",
  "mapping.chooseScoreTitle": "Оноо эсвэл хэмжүүрийн баганыг сонгоно уу.",
  "mapping.headerDetected": "{row}-р гарчгийн мөр {confidence}% итгэлтэй илэрлээ",
  "mapping.ready": "Аналитикт бэлэн",
  "mapping.confirmationsNeeded": "{count} баталгаажуулалт хэрэгтэй",
  "mapping.parseWarnings": "{count} уншилтын анхааруулга",
  "mapping.blocked": "Түгжигдсэн",
  "mapping.warnings": "Анхааруулга",
  "mapping.structureNotes": "CSV бүтцийн тэмдэглэл",
  "mapping.uploadedColumn": "Оруулсан багана",
  "mapping.flexibleRole": "Уян үүрэг",
  "mapping.confidence": "Итгэлцүүр",
  "mapping.wideLabel": "Өргөн баганын шошго",
  "mapping.confirmation": "Баталгаажуулалт",
  "mapping.noSample": "Жишээ алга",
  "mapping.ambiguous": "Тодорхойгүй",
  "mapping.needsConfirmation": "Баталгаажуулах хэрэгтэй",
  "mapping.confirmed": "Баталгаажсан",
  "mapping.run": "Аналитик ажиллуулах",
  "mapping.use": "Энэ зураглалыг ашиглах",
  "mapping.showAuto": "{count} автоматаар тайлбарласан баганыг харуулах",
  "mapping.csvPreview": "CSV урьдчилсан харагдац",
  "formulas.kicker": "Томьёоны лавлах",
  "formulas.title": "Самбар үр дүнг хэрхэн тооцдог вэ",
  "formulas.body": "Эдгээр томьёо нь детерминистик аналитикийг тайлбарлана. AI зөвхөн нэгтгэсэн үр дүнг тайлбарлах бөгөөд дүн тооцох эсвэл сурагч үнэлэхгүй.",
  "formulas.extraKicker": "Extra томьёоны гарын авлага",
  "formulas.extraTitle": "Extra модуль бүр юу илэрхийлдэг вэ",
  "formulas.extraBody": "Extra модуль нь ангийн түвшний хяналтад зориулсан дэвшилтэт статистик дохио. Хамаарал, тэнцвэр, хэлбэлзэл, хамралтыг харуулна, шалтгаан гэж дүгнэхгүй.",
  "formulas.snapshot": "Одоогийн өгөгдлийн агшин",
  "architecture.kicker": "Системийн архитектур",
  "architecture.title": "Дотоод-first аналитик хөдөлгүүр хэрхэн бүтээгдсэн бэ",
  "architecture.body": "Энэ архитектурын хуудас браузер-only pipeline, нууцлалын загвар, AI хязгаар, worker, экспорт, deploy стратегийг баримтжуулна.",
  "architecture.badge": "Өгөгдлийн сангүй, нэвтрэлтгүй, backend хадгалалтгүй",
};

const fieldLabelsEn: Record<InternalField, string> = {
  studentId: "Student ID",
  studentName: "Student name",
  subject: "Subject",
  assessment: "Assessment",
  topic: "Topic",
  category: "Category / standard",
  group: "Class / group",
  term: "Term / period",
  metricLabel: "Metric label",
  context: "Context",
  notes: "Notes",
  score: "Score",
  maxScore: "Max score",
  date: "Date",
  ignore: "Ignore",
};

const fieldLabelsMn: Record<InternalField, string> = {
  studentId: "Сурагчийн ID",
  studentName: "Сурагчийн нэр",
  subject: "Хичээл",
  assessment: "Үнэлгээ",
  topic: "Сэдэв",
  category: "Ангилал / стандарт",
  group: "Анги / бүлэг",
  term: "Улирал / үе",
  metricLabel: "Хэмжүүрийн шошго",
  context: "Контекст",
  notes: "Тэмдэглэл",
  score: "Оноо",
  maxScore: "Дээд оноо",
  date: "Огноо",
  ignore: "Алгасах",
};

const labelMn: Record<string, string> = {
  "Needs support": "Дэмжлэг хэрэгтэй",
  Approaching: "Дөхөж байна",
  Proficient: "Чадварлаг",
  Advanced: "Ахисан",
  "Overall classroom": "Анги нийтээрээ",
  Unspecified: "Тодорхойгүй",
  "Earlier records": "Өмнөх рекордууд",
  "Later records": "Сүүлийн рекордууд",
  "Assessment set": "Үнэлгээний багц",
  "High consistency cohort": "Өндөр тогтвортой cohort",
  "Volatile cohort": "Хэлбэлзэлтэй cohort",
  "Improving cohort": "Сайжирч буй cohort",
  "Fragmented mastery cohort": "Жигд бус эзэмшлийн cohort",
  "Coverage balance": "Хамралтын тэнцвэр",
  "Momentum stability": "Ахицын тогтвортой байдал",
  "Relationship density": "Хамаарлын нягтрал",
  "Assessment diversity": "Үнэлгээний олон янз байдал",
  "Signal confidence": "Дохионы итгэлцүүр",
  Math: "Математик",
  Mathematics: "Математик",
  English: "Англи хэл",
  Science: "Байгалийн ухаан",
  History: "Түүх",
  Geography: "Газарзүй",
  Languages: "Хэл",
  "Computer Science": "Компьютерын ухаан",
  Arts: "Урлаг",
  Economics: "Эдийн засаг",
  Music: "Хөгжим",
  Reading: "Уншлага",
  Writing: "Бичих чадвар",
  Vocabulary: "Үгийн сан",
  Grammar: "Дүрэм",
  Fractions: "Бутархай",
  Geometry: "Геометр",
  Algebra: "Алгебр",
  "Algebra Quiz": "Алгебрын асуулт",
  overrepresented: "хэт төлөөлсөн",
  underrepresented: "дутуу төлөөлсөн",
  balanced: "тэнцвэртэй",
  weak: "сул",
  moderate: "дунд",
  strong: "хүчтэй",
  swing: "огцом хэлбэлзэл",
  volatility: "хэлбэлзэл",
  polarization: "туйлшрал",
  coverage: "хамралт",
  "high variance": "өндөр хэлбэлзэл",
  "concentrated focus": "төвлөрсөн хамралт",
  "low competency diversity": "чадварын олон янз байдал бага",
};

const directionMn: Record<string, string> = {
  improving: "сайжирч байна",
  declining: "буурч байна",
  flat: "тогтвортой",
  insufficient_data: "мэдээлэл дутуу",
};

export function t(locale: Locale, key: TranslationKey, values?: Record<string, string | number>) {
  const template = locale === "mn" ? mn[key] ?? translations[key] : translations[key];
  return Object.entries(values ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

export function fieldLabel(field: InternalField, locale: Locale) {
  return locale === "mn" ? fieldLabelsMn[field] : fieldLabelsEn[field];
}

export function localizeLabel(label: string, locale: Locale) {
  if (locale !== "mn") {
    return label;
  }

  const trimmed = label.trim();
  if (labelMn[trimmed]) {
    return labelMn[trimmed];
  }

  const segmentMatch = trimmed.match(/^Segment (\d+)$/);
  if (segmentMatch) {
    return `${segmentMatch[1]}-р хэсэг`;
  }

  const clusterMatch = trimmed.match(/^Cluster (\d+)$/);
  if (clusterMatch) {
    return `${clusterMatch[1]}-р кластер`;
  }

  return trimmed;
}

export function localizeDirection(direction: string, locale: Locale) {
  if (locale !== "mn") {
    return direction.replace("_", " ");
  }

  return directionMn[direction] ?? direction.replace("_", " ");
}

export function languageName(locale: Locale) {
  return locale === "mn" ? "MN" : "ENG";
}
