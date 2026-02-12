import crypto from "node:crypto";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import { config } from "./lib/config";
import { connectDb } from "./lib/db";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { errors } from "./lib/errors";
import { sendError, sendSuccess } from "./lib/response";
import authRoutes from "./auth";
import userRoutes from "./users";
import projectRoutes from "./projects";
import projectTreeRoutes from "./projects/project-tree";
import buildingRoutes from "./buildings";
import floorRoutes from "./floors";
import disciplineRoutes from "./disciplines";
import drawingRoutes from "./drawings";
import taskRoutes from "./tasks";
import photoRoutes from "./photos";
import templateRoutes from "./templates";
import zoneRoutes from "./zones";
import reportRoutes from "./reports";
import roomRoutes from "./rooms";
import { seedAdminUser } from "./auth/seed-admin";

const app = express();
app.set("trust proxy", 1);

const origins = config.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origins.includes("*")) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false // Cho phep embed PDF trong <iframe> tag
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers["x-request-id"] as string) ?? crypto.randomUUID(),
    // Log ngan gon: chi method, url, status, time
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode })
    },
    // Khong log health check
    autoLogging: {
      ignore: (req) => req.url === "/health"
    }
  })
);

app.use((req, res, next) => {
  if ((req as { id?: string }).id) {
    res.setHeader("x-request-id", (req as { id?: string }).id as string);
  }
  next();
});

app.get("/api/health", (_req, res) => sendSuccess(res, { ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/project-tree", projectTreeRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/floors", floorRoutes);
app.use("/api/disciplines", disciplineRoutes);
app.use("/api/drawings", drawingRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/rooms", roomRoutes);

app.use((req, res) => {
  sendError(res, errors.notFound(`Khong tim thay ${req.path}`));
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDb();
    await seedAdminUser();
    app.listen(config.port, () => {
      logger.info(`Server running at http://localhost:${config.port}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

start();
