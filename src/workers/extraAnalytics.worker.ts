import { computeExtraAnalytics } from "@/lib/extraAnalytics";
import type { NormalizedRecord } from "@/lib/types";

type ExtraAnalyticsWorkerRequest = {
  type: "compute-extra";
  records: NormalizedRecord[];
};

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<ExtraAnalyticsWorkerRequest>) => {
  if (event.data.type !== "compute-extra") {
    return;
  }

  try {
    const extraAnalytics = computeExtraAnalytics(event.data.records);
    worker.postMessage({ type: "success", extraAnalytics });
  } catch (error) {
    worker.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "EXTRA analytics worker failed.",
    });
  }
};

export {};
