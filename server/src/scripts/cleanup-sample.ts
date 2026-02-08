import "dotenv/config";
import mongoose from "mongoose";

import { connectDb } from "../lib/db";
import { logger } from "../lib/logger";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";
import { ZoneModel } from "../zones/zone.model";
import { PhotoModel } from "../photos/photo.model";
import { CounterModel } from "../tasks/counter.model";
import { TemplateModel } from "../templates/template.model";

const cleanupSample = async () => {
  await connectDb();

  const project = await ProjectModel.findOne({ code: "PRJ", name: "Du an Mau" });
  if (!project) {
    logger.info("No sample project found, skip cleanup");
    await mongoose.connection.close();
    return;
  }

  const projectId = project._id;

  const buildings = await BuildingModel.find({ projectId }).select("_id");
  const buildingIds = buildings.map((item) => item._id);

  const floors = await FloorModel.find({ projectId }).select("_id");
  const floorIds = floors.map((item) => item._id);

  const disciplines = await DisciplineModel.find({ projectId }).select("_id");
  const disciplineIds = disciplines.map((item) => item._id);

  const drawings = await DrawingModel.find({ projectId }).select("_id");
  const drawingIds = drawings.map((item) => item._id);

  const tasks = await TaskModel.find({ projectId }).select("_id");
  const taskIds = tasks.map((item) => item._id);

  await ZoneModel.deleteMany({ taskId: { $in: taskIds } });
  await PhotoModel.deleteMany({ taskId: { $in: taskIds } });
  await TaskModel.deleteMany({ _id: { $in: taskIds } });
  await DrawingModel.deleteMany({ _id: { $in: drawingIds } });
  await DisciplineModel.deleteMany({ _id: { $in: disciplineIds } });
  await FloorModel.deleteMany({ _id: { $in: floorIds } });
  await BuildingModel.deleteMany({ _id: { $in: buildingIds } });
  await ProjectModel.deleteMany({ _id: projectId });
  await CounterModel.deleteMany({ _id: projectId.toString() });

  await TemplateModel.deleteMany({ name: "Do dai", category: "dimension" });

  logger.info("Cleanup sample data done");
  await mongoose.connection.close();
};

cleanupSample().catch((err) => {
  logger.error({ err }, "Cleanup sample failed");
  process.exit(1);
});
