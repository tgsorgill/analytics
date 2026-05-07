import { computeAnalytics } from "@/lib/analytics";
import type { NormalizedRecord } from "@/lib/types";

type AnalyticsWorkerRequest = {
  type: "compute";
  records: NormalizedRecord[];
};

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<AnalyticsWorkerRequest>) => {
  if (event.data.type !== "compute") {
    return;
  }

  try {
    const analytics = computeAnalytics(event.data.records);
    worker.postMessage({ type: "success", analytics });
  } catch (error) {
    worker.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Analytics worker failed.",
    });
  }
};

export {};
