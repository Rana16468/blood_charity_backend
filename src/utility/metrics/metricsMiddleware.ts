import { Router, Request, Response } from "express";
import { metricsService } from "./metrics.service";
import httpStatus from "http-status";



const monitorRouter = Router();

monitorRouter.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.status(httpStatus.CREATED).json(metrics);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

export default monitorRouter;