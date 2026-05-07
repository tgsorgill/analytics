# Local-First Educational Analytics

A browser-only Next.js application for teacher-owned CSV assessment analysis.

The app parses CSV files locally, infers flexible school-data structure, only asks teachers for help when the score/metric is unclear, normalizes records, computes deterministic analytics in a Web Worker, renders dashboards in Recharts, and optionally asks Hugging Face for teacher-friendly classroom summaries using only aggregated anonymized findings.

## Privacy Model

- No database
- No authentication
- No backend persistence
- No raw CSV data sent to AI
- No server-side storage of user data
- Hugging Face token is configured by the app owner with `NEXT_PUBLIC_HF_TOKEN`; teachers do not enter tokens
- Because this is browser-only, any configured `NEXT_PUBLIC_*` token is visible in the client bundle and should be treated as a public app token
- AI is positioned as a classroom analytics assistant, not a child evaluator, psychologist, doctor, IQ evaluator, disciplinary authority, future predictor, or automated decision-maker

## Commands

```bash
npm install
npm run dev
npm run build
```
