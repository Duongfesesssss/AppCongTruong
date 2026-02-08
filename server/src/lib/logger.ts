import pino from "pino";

import { isProd } from "./config";

export const logger = pino({
  level: isProd ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true
  }
});
