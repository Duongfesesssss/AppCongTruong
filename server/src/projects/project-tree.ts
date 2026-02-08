import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { requireAuth } from "../middlewares/require-auth";
import { ProjectModel } from "./project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";

const router = Router();

type TreeNode = {
  id: string;
  name: string;
  type: string;
  children: TreeNode[];
};

const createNode = (id: string, name: string, type: string): TreeNode => ({
  id,
  name,
  type,
  children: []
});

const sortTree = (nodes: TreeNode[]) => {
  nodes.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  nodes.forEach((node) => {
    if (node.children.length > 0) sortTree(node.children);
  });
};

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Lấy danh sách project của user hiện tại
    const userProjects = await ProjectModel.find({ userId: req.user!.id }).lean();
    const projectIds = userProjects.map((p) => p._id);

    // Filter tất cả theo projectIds của user
    const [buildings, floors, disciplines, drawings, tasks] = await Promise.all([
      BuildingModel.find({ projectId: { $in: projectIds } }).lean(),
      FloorModel.find({ projectId: { $in: projectIds } }).lean(),
      DisciplineModel.find({ projectId: { $in: projectIds } }).lean(),
      DrawingModel.find({ projectId: { $in: projectIds } }).lean(),
      TaskModel.find({ projectId: { $in: projectIds } }).lean()
    ]);

    const projectMap = new Map<string, TreeNode>();
    const buildingMap = new Map<string, TreeNode>();
    const floorMap = new Map<string, TreeNode>();
    const disciplineMap = new Map<string, TreeNode>();
    const drawingMap = new Map<string, TreeNode>();

    userProjects.forEach((project) => {
      projectMap.set(project._id.toString(), createNode(project._id.toString(), project.name, "project"));
    });

    buildings.forEach((building) => {
      const node = createNode(building._id.toString(), building.name, "building");
      buildingMap.set(building._id.toString(), node);

      const parent = projectMap.get(building.projectId.toString());
      if (parent) parent.children.push(node);
    });

    floors.forEach((floor) => {
      const node = createNode(floor._id.toString(), floor.name, "floor");
      floorMap.set(floor._id.toString(), node);

      const parent = buildingMap.get(floor.buildingId.toString());
      if (parent) parent.children.push(node);
    });

    disciplines.forEach((discipline) => {
      const node = createNode(discipline._id.toString(), discipline.name, "discipline");
      disciplineMap.set(discipline._id.toString(), node);

      const parent = floorMap.get(discipline.floorId.toString());
      if (parent) parent.children.push(node);
    });

    drawings.forEach((drawing) => {
      const node = createNode(drawing._id.toString(), drawing.name, "drawing");
      drawingMap.set(drawing._id.toString(), node);

      const parent = disciplineMap.get(drawing.disciplineId.toString());
      if (parent) parent.children.push(node);
    });

    tasks.forEach((task) => {
      const node = createNode(task._id.toString(), task.pinName ?? task.pinCode, "task");
      const parent = drawingMap.get(task.drawingId.toString());
      if (parent) parent.children.push(node);
    });

    const tree = Array.from(projectMap.values());
    sortTree(tree);
    return sendSuccess(res, tree);
  })
);

export default router;
