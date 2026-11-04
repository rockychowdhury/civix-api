import config from "../../config";
import { qstashClient } from "../../lib/qstash";
import { processServiceRequestJob } from "./issueProcessor";

export const enqueueIssueProcessing = async (serviceRequestId: string): Promise<void> => {
  const backendUrl = (config.backend_url || "").trim().replace(/\/$/, "");
  const isLocalhost =
    !backendUrl ||
    backendUrl.includes("localhost") ||
    backendUrl.includes("127.0.0.1") ||
    config.node_env === "development";

  // If in production with a valid public backend URL and QStash token, publish to QStash
  if (!isLocalhost && config.qstash_token && backendUrl.startsWith("http")) {
    try {
      const webhookUrl = `${backendUrl}/api/v1/queue/process-service-request`;
      console.log(`[QStash] Enqueueing service request ${serviceRequestId} to ${webhookUrl}`);

      await qstashClient.publishJSON({
        url: webhookUrl,
        body: { serviceRequestId },
        retries: 3,
      });
      return;
    } catch (error) {
      console.error("[QStash] Failed to publish message to QStash, falling back to local background execution:", error);
    }
  }

  // Local development / fallback execution
  console.log(`[Queue] Running service request ${serviceRequestId} via local async background execution`);
  setImmediate(async () => {
    try {
      await processServiceRequestJob(serviceRequestId);
    } catch (err) {
      console.error(`[Queue Fallback] Processing error for ${serviceRequestId}:`, err);
    }
  });
};
