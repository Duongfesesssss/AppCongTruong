import "dotenv/config";
import mongoose from "mongoose";

import { connectDb } from "../lib/db";
import { logger } from "../lib/logger";
import { UserModel } from "../users/user.model";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";
import { PhotoModel } from "../photos/photo.model";
import { TemplateModel } from "../templates/template.model";
import { ZoneModel } from "../zones/zone.model";
import { CounterModel } from "../tasks/counter.model";
import { seedAdminUser } from "../auth/seed-admin";

const models = [
  UserModel,
  ProjectModel,
  BuildingModel,
  FloorModel,
  DisciplineModel,
  DrawingModel,
  TaskModel,
  PhotoModel,
  TemplateModel,
  ZoneModel,
  CounterModel
];

const initDb = async () => {
  await connectDb();

  for (const model of models) {
    try {
      await model.createCollection();
      await model.init();
      logger.info({ collection: model.collection.name }, "Collection ready");
    } catch (err) {
      logger.warn({ err }, "Collection init failed");
    }
  }

  await seedAdminUser();

  await mongoose.connection.close();
  logger.info("DB init done");
};

initDb().catch((err) => {
  logger.error({ err }, "DB init failed");
  process.exit(1);
});
