import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./router";
import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";
import bodyParser from 'body-parser';
import monitorRouter from "./utility/metrics/metricsMiddleware";
import cron from 'node-cron';
import AutoDetectionBloodDonorTimeLine from "./utility/auto/AutoDetectionBloodDonorTimeLine";
import SystemMemoeryAllocation from "./utility/system";
const app = express();

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}


app.use(
  cors()
);


app.use(cookieParser());
app.use(bodyParser.json());


app.use(
  express.json({
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);


app.use(express.urlencoded({ extended: true }));


app.get("/", (_req, res) => {
  res.send(SystemMemoeryAllocation());
});


cron.schedule("*/10 * * * *", async () => {
  try {
    await AutoDetectionBloodDonorTimeLine();
  } catch (error) {
    console.error(error);
  }
});

app.use("/api/v1", router);
app.use("/api/v1/monitor", monitorRouter); 


app.use(notFound);
app.use(globalErrorHandelar);

export default app;