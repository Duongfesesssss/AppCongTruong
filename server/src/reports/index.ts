import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { Router } from "express";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import { asyncHandler } from "../lib/response";
import { config } from "../lib/config";
import { errors } from "../lib/errors";
import { getS3Stream } from "../lib/s3";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { exportExcelSchema, exportImagesSchema } from "./report.schema";
import { PhotoModel } from "../photos/photo.model";
import { TaskModel } from "../tasks/task.model";
import { DrawingModel } from "../drawings/drawing.model";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";

const router = Router();

const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const sanitizeFileName = (value: string, fallback: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
};

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const getPhotoBuffer = async (storageKey: string): Promise<Buffer> => {
  if (config.storageType === "s3") {
    const stream = await getS3Stream(storageKey);
    return streamToBuffer(stream);
  }

  const safeKey = path.basename(storageKey);
  const filePath = path.join(process.cwd(), "uploads", "photos", safeKey);
  if (!fs.existsSync(filePath)) {
    throw errors.notFound(`File ảnh không tồn tại: ${safeKey}`);
  }
  return fs.promises.readFile(filePath);
};

const getPhotoExtension = (storageKey: string, mimeType: string) => {
  const extFromStorage = path.extname(storageKey);
  if (extFromStorage) return extFromStorage;
  return mimeToExt[mimeType] || ".jpg";
};

router.get(
  "/export-excel",
  requireAuth,
  validate(exportExcelSchema),
  asyncHandler(async (req, res) => {
    const { projectId, drawingId, from, to } = req.query as {
      projectId?: string;
      drawingId?: string;
      from?: string;
      to?: string;
    };

    const photoFilter: Record<string, unknown> = {};
    if (drawingId) photoFilter.drawingId = drawingId;

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      photoFilter.createdAt = range;
    }

    let taskIds: string[] | undefined;
    if (projectId) {
      const tasks = await TaskModel.find({ projectId }).select("_id");
      taskIds = tasks.map((task) => task._id.toString());
      photoFilter.taskId = { $in: taskIds };
    }

    const photos = await PhotoModel.find(photoFilter).lean();

    const uniqueTaskIds = Array.from(new Set(photos.map((photo) => photo.taskId.toString())));
    const tasks = await TaskModel.find({ _id: { $in: uniqueTaskIds } }).lean();

    const drawingIds = Array.from(new Set(photos.map((photo) => photo.drawingId.toString())));
    const drawings = await DrawingModel.find({ _id: { $in: drawingIds } }).lean();

    const projectIds = Array.from(new Set(tasks.map((task) => task.projectId.toString())));
    const projects = await ProjectModel.find({ _id: { $in: projectIds } }).lean();

    const buildingIds = Array.from(new Set(tasks.map((task) => task.buildingId.toString())));
    const buildings = await BuildingModel.find({ _id: { $in: buildingIds } }).lean();

    const floorIds = Array.from(new Set(tasks.map((task) => task.floorId.toString())));
    const floors = await FloorModel.find({ _id: { $in: floorIds } }).lean();

    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));
    const drawingMap = new Map(drawings.map((drawing) => [drawing._id.toString(), drawing]));
    const projectMap = new Map(projects.map((project) => [project._id.toString(), project]));
    const buildingMap = new Map(buildings.map((building) => [building._id.toString(), building]));
    const floorMap = new Map(floors.map((floor) => [floor._id.toString(), floor]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo đo đạc");

    // Headers theo MEASUREMENT_STRUCTURE.md
    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Tên ảnh", key: "photoName", width: 25 },
      { header: "Bản vẽ", key: "drawing", width: 25 },
      { header: "Mã pin", key: "pinCode", width: 25 },
      { header: "Tên pin", key: "pinName", width: 20 },
      { header: "Dự án", key: "project", width: 20 },
      { header: "Tòa", key: "building", width: 18 },
      { header: "Tầng", key: "floor", width: 12 },
      { header: "Phòng/Khu vực (ảnh)", key: "photoLocation", width: 20 },
      { header: "Phòng/Khu vực (đo)", key: "measureRoom", width: 20 },
      { header: "Tên đo đạc", key: "measureName", width: 25 },
      { header: "Loại đo đạc", key: "measureCategory", width: 15 },
      { header: "Giá trị", key: "realValue", width: 12 },
      { header: "Đơn vị", key: "unit", width: 10 },
      { header: "Tỷ lệ (đơn vị/px)", key: "scale", width: 15 },
      { header: "Ghi chú", key: "notes", width: 30 },
      { header: "Ngày đo", key: "measuredAt", width: 20 }
    ];

    // Category labels map
    const categoryLabels: Record<string, string> = {
      width: "Chiều dài/rộng",
      height: "Chiều cao",
      depth: "Chiều sâu/độ dày",
      diagonal: "Đường chéo",
      perimeter: "Chu vi",
      area: "Diện tích",
      other: "Khác"
    };

    // Parse legacy realDistance "2.5m" → { value: 2.5, unit: "m" }
    const parseRealDistance = (str: string): { value: number; unit: string } => {
      const match = str.match(/^([0-9]*[.,]?[0-9]+)\s*(.*)$/);
      if (!match) return { value: NaN, unit: "" };
      return {
        value: parseFloat(match[1].replace(",", ".")),
        unit: match[2].trim() || "m"
      };
    };

    let rowNumber = 0;

    photos.forEach((photo) => {
      const task = taskMap.get(photo.taskId.toString());
      const drawing = drawingMap.get(photo.drawingId.toString());
      const project = task ? projectMap.get(task.projectId.toString()) : undefined;
      const building = task ? buildingMap.get(task.buildingId.toString()) : undefined;
      const floor = task ? floorMap.get(task.floorId.toString()) : undefined;

      // Parse annotations as Line[]
      const rawAnnotations = photo.annotations as unknown;
      const annotations = Array.isArray(rawAnnotations) ? rawAnnotations : [];

      // Export each line measurement
      annotations.forEach((line: any) => {
        // Skip if no measurement data
        if (!line.name && !line.realDistance && !line.realValue) {
          return;
        }

        rowNumber++;

        // Format date
        const measuredAt = line.createdAt
          ? new Date(line.createdAt).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            })
          : photo.createdAt
            ? new Date(photo.createdAt).toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "";

        // Format scale
        const scale = line.scale
          ? line.scale.toFixed(6)
          : "";

        // Tách value và unit: ưu tiên field mới, fallback parse từ realDistance
        let exportValue: number | string = "";
        let exportUnit: string = line.unit ?? "";

        if (line.realValue != null && !isNaN(Number(line.realValue))) {
          exportValue = Number(line.realValue);
        } else if (line.realDistance) {
          const parsed = parseRealDistance(String(line.realDistance));
          if (!isNaN(parsed.value)) {
            exportValue = parsed.value;
            if (!exportUnit) exportUnit = parsed.unit;
          }
        }

        sheet.addRow({
          stt: rowNumber,
          photoName: photo.name ?? "",
          drawing: drawing?.name ?? "",
          pinCode: task?.pinCode ?? "",
          pinName: task?.pinName ?? "",
          project: project?.name ?? "",
          building: building?.name ?? "",
          floor: floor?.name ?? "",
          photoLocation: photo.location ?? "",
          measureRoom: line.room ?? "",
          measureName: line.name ?? "",
          measureCategory: line.category ? categoryLabels[line.category] || line.category : "",
          realValue: exportValue,
          unit: exportUnit,
          scale,
          notes: line.notes ?? "",
          measuredAt
        });
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=bao-cao.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  })
);

router.get(
  "/export-images",
  requireAuth,
  validate(exportImagesSchema),
  asyncHandler(async (req, res) => {
    const { drawingId, from, to } = req.query as {
      drawingId: string;
      from?: string;
      to?: string;
    };

    const drawing = await DrawingModel.findById(drawingId).select("_id name projectId");
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id }).select("_id");
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    const photoFilter: Record<string, unknown> = { drawingId };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      photoFilter.createdAt = range;
    }

    const photos = await PhotoModel.find(photoFilter)
      .sort({ createdAt: 1 })
      .select("storageKey mimeType name createdAt")
      .lean();

    if (!photos.length) {
      throw errors.notFound("Không có ảnh nào trong bản vẽ");
    }

    const zip = new JSZip();

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const extension = getPhotoExtension(photo.storageKey, photo.mimeType);
      const baseName = sanitizeFileName(photo.name || `anh-${index + 1}`, `anh-${index + 1}`);
      const zipEntryName = `${String(index + 1).padStart(3, "0")}-${baseName}${extension}`;

      const content = await getPhotoBuffer(photo.storageKey);
      zip.file(zipEntryName, content);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const drawingName = sanitizeFileName(drawing.name || "drawing", "drawing");
    const downloadFileName = `anh-${drawingName}-${Date.now()}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFileName}"`);
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.send(zipBuffer);
  })
);

export default router;
