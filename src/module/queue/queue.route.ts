import { Router } from "express";
import { QueueController } from "./queue.controller";

const router = Router();

router.post("/process-service-request", QueueController.handleQStashServiceRequest);

export const QueueRoutes = router;

