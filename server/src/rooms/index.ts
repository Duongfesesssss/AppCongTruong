import fs from "node:fs";

import { Router } from "express";
import * as XLSX from "xlsx";
import { z } from "zod";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { config } from "../lib/config";
import { createUploader } from "../lib/uploads";
import { sanitizeText } from "../lib/utils";
import { objectIdSchema } from "../lib/validators";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";
import { RoomModel } from "./room.model";
import { roomSuggestionSchema } from "./room.schema";

const router = Router();
const excelUpload = createUploader({
  subDir: "rooms",
  allowedMime: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  maxMb: 5
});

const importRoomBodySchema = z.object({
  drawingId: objectIdSchema
});

const normalizeName = (value: string) => sanitizeText(value).toLocaleLowerCase("vi");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCellValue = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const match = entries.find(([key]) => key.trim().toLocaleLowerCase("vi") === alias.toLocaleLowerCase("vi"));
    if (!match) continue;
    const value = match[1];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    return text;
  }
  return undefined;
};

const cleanupUpload = (file?: Express.Multer.File) => {
  if (!file || config.storageType === "s3") return;
  if (file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

router.post(
  "/import-excel",
  requireAuth,
  excelUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yêu cầu file Excel");
    }

    const parsedBody = importRoomBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      cleanupUpload(req.file);
      throw errors.validation("drawingId bắt buộc");
    }
    const drawingId = parsedBody.data.drawingId.trim();

    const drawing = await DrawingModel.findById(drawingId);
    if (!drawing) {
      cleanupUpload(req.file);
      throw errors.notFound("Drawing không tồn tại");
    }

    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) {
      cleanupUpload(req.file);
      throw errors.notFound("Không có quyền");
    }

    let rows: Array<Record<string, unknown>> = [];
    try {
      const workbook = req.file.buffer
        ? XLSX.read(req.file.buffer, { type: "buffer" })
        : XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    } catch (err) {
      cleanupUpload(req.file);
      throw errors.validation((err as Error).message || "Không đọc được file Excel");
    }

    const buildingCache = new Map<string, string>();
    const floorCache = new Map<string, { id: string; buildingId: string }>();

    const resolveBuildingByCodeOrName = async (value?: string) => {
      if (!value) return drawing.buildingId.toString();
      const key = value.toLocaleLowerCase("vi");
      if (buildingCache.has(key)) return buildingCache.get(key) as string;

      const building = await BuildingModel.findOne({
        projectId: drawing.projectId,
        $or: [{ code: value.toUpperCase() }, { name: value }]
      }).select("_id");

      const resolved = building?._id.toString() ?? drawing.buildingId.toString();
      buildingCache.set(key, resolved);
      return resolved;
    };

    const resolveFloorByCodeOrName = async (buildingId: string, value?: string) => {
      if (!value) {
        return { id: drawing.floorId.toString(), buildingId: drawing.buildingId.toString() };
      }

      const key = `${buildingId}:${value.toLocaleLowerCase("vi")}`;
      if (floorCache.has(key)) return floorCache.get(key) as { id: string; buildingId: string };

      const floor = await FloorModel.findOne({
        projectId: drawing.projectId,
        buildingId,
        $or: [{ code: value.toUpperCase() }, { name: value }]
      }).select("_id buildingId");

      const resolved = floor
        ? { id: floor._id.toString(), buildingId: floor.buildingId.toString() }
        : { id: drawing.floorId.toString(), buildingId: drawing.buildingId.toString() };
      floorCache.set(key, resolved);
      return resolved;
    };

    const operations: any[] = [];
    let skipped = 0;

    for (const row of rows) {
      const roomNameRaw = getCellValue(row, ["roomname", "room_name", "ten phong", "tên phòng", "name"]);
      const roomCodeRaw = getCellValue(row, ["roomcode", "room_code", "ma phong", "mã phòng", "code"]);
      if (!roomNameRaw && !roomCodeRaw) {
        skipped += 1;
        continue;
      }

      const roomName = sanitizeText(roomNameRaw || roomCodeRaw || "");
      if (!roomName) {
        skipped += 1;
        continue;
      }

      const buildingHint = getCellValue(row, ["building", "toa", "toa nha", "tòa nhà", "buildingcode", "building_code"]);
      const floorHint = getCellValue(row, ["floor", "tang", "tầng", "floorcode", "floor_code"]);

      const buildingId = await resolveBuildingByCodeOrName(buildingHint);
      const floorResolved = await resolveFloorByCodeOrName(buildingId, floorHint);
      const roomCode = roomCodeRaw ? sanitizeText(roomCodeRaw) : undefined;
      const normalized = normalizeName(roomName);

      const filter = roomCode
        ? { projectId: drawing.projectId, buildingId: floorResolved.buildingId, floorId: floorResolved.id, roomCode }
        : { projectId: drawing.projectId, buildingId: floorResolved.buildingId, floorId: floorResolved.id, normalizedName: normalized };

      operations.push({
        updateOne: {
          filter,
          update: {
            $set: {
              projectId: drawing.projectId,
              buildingId: floorResolved.buildingId,
              floorId: floorResolved.id,
              drawingId: drawing._id,
              roomCode,
              roomName,
              normalizedName: normalized
            }
          },
          upsert: true
        }
      });
    }

    let imported = 0;
    if (operations.length > 0) {
      const result = await RoomModel.bulkWrite(operations);
      imported = Number(result.upsertedCount || 0) + Number(result.modifiedCount || 0);
    }

    cleanupUpload(req.file);
    return sendSuccess(res, {
      imported,
      skipped,
      totalRows: rows.length
    });
  })
);

router.get(
  "/suggestions",
  requireAuth,
  validate(roomSuggestionSchema),
  asyncHandler(async (req, res) => {
    const drawingId = req.query.drawingId as string;
    const q = (req.query.q as string | undefined)?.trim();
    const limit = Number(req.query.limit || 80);

    const drawing = await DrawingModel.findById(drawingId);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Không có quyền");

    const roomFilter: Record<string, unknown> = {
      projectId: drawing.projectId,
      buildingId: drawing.buildingId,
      floorId: drawing.floorId
    };

    if (q) {
      const pattern = new RegExp(escapeRegExp(q), "i");
      roomFilter.$or = [
        { roomName: pattern },
        { roomCode: pattern }
      ];
    }

    const rooms = await RoomModel.find(roomFilter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("roomName roomCode normalizedName")
      .lean();

    const taskRooms = await TaskModel.find(
      {
        projectId: drawing.projectId,
        buildingId: drawing.buildingId,
        floorId: drawing.floorId,
        roomName: { $exists: true, $ne: "" }
      },
      { roomName: 1, _id: 0 }
    )
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const seen = new Set<string>();
    const suggestions: Array<{ roomName: string; roomCode?: string }> = [];

    rooms.forEach((room) => {
      const key = room.normalizedName || normalizeName(room.roomName);
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push({
        roomName: room.roomName,
        roomCode: room.roomCode || undefined
      });
    });

    taskRooms.forEach((taskRoom) => {
      if (!taskRoom.roomName) return;
      const key = normalizeName(taskRoom.roomName);
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push({ roomName: taskRoom.roomName });
    });

    return sendSuccess(res, suggestions.slice(0, limit));
  })
);

export default router;
