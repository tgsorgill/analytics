"use client";

import type { AnalyticsResult, NormalizedRecord } from "@/lib/types";

export function computeAnalyticsInWorker(records: NormalizedRecord[]) {
  return new Promise<AnalyticsResult>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/analytics.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "success") {
        resolve(event.data.analytics);
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

    worker.postMessage({ type: "compute", records });
  });
}
