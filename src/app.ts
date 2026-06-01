import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./router";
import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";
import bodyParser from 'body-parser';
// import cron from 'node-cron';
const app = express();

/**
 * ========================
 * GLOBAL TYPE EXTENSION
 * ========================
 */
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * ========================
 * CORS CONFIG (SECURE)
 * ========================
 */
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

/**
 * ========================
 * COOKIE PARSER
 * ========================
 */
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

/**
 * ========================
 * ROOT ROUTE
 * ========================
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Rakto Daan Server is Running 🚀",
  });
});

/**
 * ========================
 * API ROUTES
 * ========================
 */
app.use("/api/v1", router);

/**
 * ========================
 * ERROR HANDLING
 * ========================
 */
app.use(notFound);
app.use(globalErrorHandelar);

export default app;