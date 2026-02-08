import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mongoose from "mongoose";

import { connectDb } from "../lib/db";
import { logger } from "../lib/logger";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";
import { CounterModel } from "../tasks/counter.model";
import { ZoneModel } from "../zones/zone.model";
import { PhotoModel } from "../photos/photo.model";
import { TemplateModel } from "../templates/template.model";
import { formatPinCode, sanitizeText, toCode } from "../lib/utils";

const pdfBase64 =
  "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwMF0vUmVzb3VyY2VzPDwvUHJvY1NldFsvUERGL0ltYWdlQ10+Pj4vQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PnN0cmVhbQpCVCAvRjEgMTIgVGYgNzIgMTIwIFRkIChTYW1wbGUpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjI0IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMzEwCiUlRU9G";

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const seedSample = async () => {
  await connectDb();

  const existed = await ProjectModel.findOne({ code: "PRJ" });
  if (existed) {
    logger.info("Sample data already exists, skip seed");
    await mongoose.connection.close();
    return;
  }

  const project = await ProjectModel.create({
    name: sanitizeText("Du an Mau"),
    code: "PRJ",
    description: "Du an demo"
  });

  const building = await BuildingModel.create({
    projectId: project._id,
    name: sanitizeText("Toa A"),
    code: "BLD"
  });

  const floor = await FloorModel.create({
    projectId: project._id,
    buildingId: building._id,
    name: sanitizeText("Tang 1"),
    code: "F01",
    level: 1
  });

  const discipline = await DisciplineModel.create({
    projectId: project._id,
    buildingId: building._id,
    floorId: floor._id,
    name: sanitizeText("Dien"),
    code: "EL"
  });

  const drawingsDir = path.join(process.cwd(), "uploads", "drawings");
  ensureDir(drawingsDir);
  const drawingFile = `sample-${crypto.randomUUID()}.pdf`;
  fs.writeFileSync(path.join(drawingsDir, drawingFile), Buffer.from(pdfBase64, "base64"));
  const pdfStat = fs.statSync(path.join(drawingsDir, drawingFile));

  const drawing = await DrawingModel.create({
    projectId: project._id,
    buildingId: building._id,
    floorId: floor._id,
    disciplineId: discipline._id,
    name: sanitizeText("Mat bang tang 1"),
    originalName: "sample.pdf",
    storageKey: drawingFile,
    mimeType: "application/pdf",
    size: pdfStat.size
  });

  const counter = await CounterModel.findOneAndUpdate(
    { _id: project._id.toString() },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const gewerkCode = toCode("ME", 2);
  const pinCode = formatPinCode(project.code, building.code, floor.code, gewerkCode, counter.seq);

  const task = await TaskModel.create({
    projectId: project._id,
    buildingId: building._id,
    floorId: floor._id,
    disciplineId: discipline._id,
    drawingId: drawing._id,
    pinX: 0.35,
    pinY: 0.45,
    status: "open",
    category: "quality",
    description: sanitizeText("Kiem tra chat luong be tong"),
    roomName: sanitizeText("P.101"),
    pinName: sanitizeText("Kiem tra mau"),
    gewerk: sanitizeText("ME"),
    notes: [sanitizeText("Can chup anh hien truong")],
    pinCode
  });

  const zone = await ZoneModel.create({
    taskId: task._id,
    drawingId: drawing._id,
    status: "open",
    shape: { x: 0.3, y: 0.4, width: 0.2, height: 0.1 },
    style: { color: "#2563eb", opacity: 0.3 },
    notes: [sanitizeText("Vung can kiem tra")]
  });

  const photosDir = path.join(process.cwd(), "uploads", "photos");
  ensureDir(photosDir);
  const photoFile = `sample-${crypto.randomUUID()}.png`;
  fs.writeFileSync(path.join(photosDir, photoFile), Buffer.from(pngBase64, "base64"));
  const photoStat = fs.statSync(path.join(photosDir, photoFile));

  await PhotoModel.create({
    taskId: task._id,
    drawingId: drawing._id,
    storageKey: photoFile,
    mimeType: "image/png",
    size: photoStat.size,
    width: 1,
    height: 1,
    annotations: [
      {
        isDimensionLine: true,
        value: 1200,
        unit: "mm",
        note: "Do mau"
      }
    ]
  });

  await TemplateModel.create({
    name: sanitizeText("Do dai"),
    category: "dimension",
    attributes: { unit: "mm", precision: 1 },
    color: "#2563eb"
  });

  logger.info({
    projectId: project._id.toString(),
    buildingId: building._id.toString(),
    floorId: floor._id.toString(),
    disciplineId: discipline._id.toString(),
    drawingId: drawing._id.toString(),
    taskId: task._id.toString(),
    zoneId: zone._id.toString()
  }, "Seed sample data done");

  await mongoose.connection.close();
};

seedSample().catch((err) => {
  logger.error({ err }, "Seed sample failed");
  process.exit(1);
});
