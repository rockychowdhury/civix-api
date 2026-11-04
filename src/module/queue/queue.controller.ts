import type { Request, Response } from "express";
import httpStatus from "http-status";
import { qstashReceiver } from "../../lib/qstash";
import { processServiceRequestJob } from "./issueProcessor";
import { catchAsync } from "../../utils/catchAsync";

const handleQStashServiceRequest = catchAsync(async (req: Request, res: Response) => {
  // 1. Verify QStash signature if signing key is configured
  if (qstashReceiver) {
    const signature = req.headers["upstash-signature"] as string | undefined;

    if (!signature) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Missing Upstash-Signature header",
      });
      return;
    }

    try {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      const isValid = await qstashReceiver.verify({
        signature,
        body: rawBody,
        url,
      });

      if (!isValid) {
        res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: "Invalid QStash signature",
        });
        return;
      }
    } catch (err) {
      console.error("[QStash Webhook] Signature verification failed:", err);
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Signature verification failed",
      });
      return;
    }
  }

  // 2. Extract serviceRequestId from payload
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const serviceRequestId = body?.serviceRequestId;

  if (!serviceRequestId) {
    res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "serviceRequestId is required in request body",
    });
    return;
  }

  // 3. Process the job
  await processServiceRequestJob(serviceRequestId);

  res.status(httpStatus.OK).json({
    success: true,
    message: "Service request processed successfully via QStash",
    data: { serviceRequestId },
  });
});

export const QueueController = {
  handleQStashServiceRequest,
};

