import { Queue } from "bullmq";
import config from "../../config";

export const ISSUE_QUEUE_NAME = "issue-processing";

export const issueQueue = new Queue(ISSUE_QUEUE_NAME, {
  connection: {
    host: config.redis_host,
    port: Number(config.redis_port),
    username: config.redis_user,
    password: config.redis_password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const enqueueIssueProcessing = async (serviceRequestId: string) => {
  await issueQueue.add("process-service-request", { serviceRequestId });
};
