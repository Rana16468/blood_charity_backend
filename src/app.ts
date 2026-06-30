import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import router from "./router";
import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";
import bodyParser from 'body-parser';
import monitorRouter from "./utility/metrics/metricsMiddleware";
import cron from 'node-cron';
import AutoDetectionBloodDonorTimeLine from "./utility/auto/AutoDetectionBloodDonorTimeLine";
import SystemMemoeryAllocation from "./utility/system";
import autoDeleteNotification from "./utility/autoDeleteNotification";
import autoDeleteBloodRequest from "./utility/metrics/autoDeleteBloodRequest";
const app = express();

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}


const allowedOrigins = [
  'https://rakro-daan.vercel.app',
  'http://localhost:5173'
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // origin is automatically typed as string | undefined by CorsOptions
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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
cron.schedule("*/30 * * * *", async () => {
  try {
    await autoDeleteNotification();
  } catch (error) {
    console.error("Auto delete notification failed:", error);
  }
});
cron.schedule("*/30 * * * *", async()=>{
  try{
    await autoDeleteBloodRequest();
  }
  catch(error){
    console.error("Auto delete Blood Requested failed:", error);
  }
})

app.use("/api/v1", router);
app.use("/api/v1/monitor", monitorRouter); 

app.use(notFound);
app.use(globalErrorHandelar);

export default app;