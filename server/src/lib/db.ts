import mongoose from "mongoose";

import { config } from "./config";
import { logger } from "./logger";

export const connectDb = async () => {
  if (!config.mongoUri) {
    throw new Error("MONGO_URI is required");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  logger.info("MongoDB connected");
};
