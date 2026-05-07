"use client";

import type { ExtraAnalyticsResult, NormalizedRecord } from "@/lib/types";

export function computeExtraAnalyticsInWorker(records: NormalizedRecord[]) {
  return new Promise<ExtraAnalyticsResult>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/extraAnalytics.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "success") {
        resolve(event.data.extraAnalytics);
        worker.terminate();
      }

      if (event.data.type === "error") {
        reject(new Error(event.data.message));
        worker.terminate();
      }
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ type: "compute-extra", records });
  });
}
