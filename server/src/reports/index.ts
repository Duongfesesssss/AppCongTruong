import { Router } from "express";
import ExcelJS from "exceljs";

import { asyncHandler } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { exportExcelSchema } from "./report.schema";
import { PhotoModel } from "../photos/photo.model";
import { TaskModel } from "../tasks/task.model";
import { DrawingModel } from "../drawings/drawing.model";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";

const router = Router();

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
          realValue: line.realValue ?? (line.realDistance ? line.realDistance : ""),
          unit: line.unit ?? "",
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

export default router;
