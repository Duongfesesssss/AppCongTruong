import { Router } from "express";
import { z } from "zod";

import { asyncHandler, sendSuccess } from "../lib/response";
import { requireAuth } from "../middlewares/require-auth";
import { validate } from "../middlewares/validation";
import { errors } from "../lib/errors";
import { sanitizeText, toCode } from "../lib/utils";
import { objectIdSchema } from "../lib/validators";
import { buildProjectAccessFilter, ensureProjectRole, getProjectRole } from "./project-access";
import { ProjectModel, type ProjectMemberRole } from "./project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { DrawingModel } from "../drawings/drawing.model";
import { TaskModel } from "../tasks/task.model";

const router = Router();

type NodeType = "project" | "building" | "floor" | "discipline" | "drawing";

const nodeTypeSchema = z.enum(["project", "building", "floor", "discipline", "drawing"]);
const reorderSchema = z.object({
  body: z.object({
    nodeType: nodeTypeSchema,
    nodeId: objectIdSchema,
    direction: z.enum(["up", "down"])
  })
});
const duplicateSchema = z.object({
  body: z.object({
    nodeType: nodeTypeSchema,
    nodeId: objectIdSchema
  })
});

type TreeNode = {
  id: string;
  name: string;
  type: string;
  sortIndex: number;
  projectId: string;
  projectRole: ProjectMemberRole;
  canManageStructure: boolean;
  children: TreeNode[];
};

const createNode = (
  id: string,
  name: string,
  type: string,
  projectId: string,
  projectRole: ProjectMemberRole,
  sortIndex = 0
): TreeNode => ({
  id,
  name,
  type,
  sortIndex,
  projectId,
  projectRole,
  canManageStructure: projectRole === "admin",
  children: []
});

const sortTree = (nodes: TreeNode[]) => {
  nodes.sort((a, b) => {
    const indexA = Number.isFinite(a.sortIndex) ? a.sortIndex : 0;
    const indexB = Number.isFinite(b.sortIndex) ? b.sortIndex : 0;
    if (indexA !== indexB) return indexA - indexB;
    return a.name.localeCompare(b.name, "vi");
  });
  nodes.forEach((node) => {
    if (node.children.length > 0) sortTree(node.children);
  });
};

const normalizeSiblingOrder = async (siblings: Array<{ sortIndex?: number; save: () => Promise<unknown> }>) => {
  let changed = false;
  siblings.forEach((item, index) => {
    const expected = index + 1;
    if (item.sortIndex !== expected) {
      item.sortIndex = expected;
      changed = true;
    }
  });
  if (changed) {
    await Promise.all(siblings.map((item) => item.save()));
  }
};

const getNextSortIndex = async (model: any, filter: Record<string, unknown>) => {
  const lastItem = await model
    .findOne(filter)
    .sort({ sortIndex: -1, createdAt: -1 })
    .select("sortIndex")
    .lean();
  return (lastItem?.sortIndex ?? 0) + 1;
};

const toCopyName = (name: string) => {
  const clean = sanitizeText(name);
  return clean.endsWith("(Copy)") ? `${clean} 2` : `${clean} (Copy)`;
};

const buildAdminProjectFilter = (userId: string) => ({
  $or: [{ userId }, { members: { $elemMatch: { userId, role: "admin" } } }]
});

const buildUniqueProjectCode = async (userId: string, name: string) => {
  const base = toCode(`${name}COPY`, 8);
  let candidate = base;
  let counter = 2;
  while (await ProjectModel.exists({ userId, code: candidate })) {
    candidate = toCode(`${base}${counter}`, 10);
    counter += 1;
  }
  return candidate;
};

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await ProjectModel.find(buildProjectAccessFilter(req.user!.id)).lean();
    const projectsWithRole = projects
      .map((project) => ({
        project,
        role: getProjectRole(project, req.user!.id)
      }))
      .filter((item): item is { project: (typeof projects)[number]; role: ProjectMemberRole } => !!item.role);

    const projectIds = projectsWithRole.map((item) => item.project._id);

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

    projectsWithRole.forEach(({ project, role }) => {
      const projectId = project._id.toString();
      projectMap.set(
        projectId,
        createNode(projectId, project.name, "project", projectId, role, project.sortIndex ?? 0)
      );
    });

    buildings.forEach((building) => {
      const parent = projectMap.get(building.projectId.toString());
      if (!parent) return;
      const node = createNode(
        building._id.toString(),
        building.name,
        "building",
        parent.projectId,
        parent.projectRole,
        building.sortIndex ?? 0
      );
      buildingMap.set(building._id.toString(), node);
      parent.children.push(node);
    });

    floors.forEach((floor) => {
      const parent = buildingMap.get(floor.buildingId.toString());
      if (!parent) return;
      const node = createNode(
        floor._id.toString(),
        floor.name,
        "floor",
        parent.projectId,
        parent.projectRole,
        floor.sortIndex ?? 0
      );
      floorMap.set(floor._id.toString(), node);
      parent.children.push(node);
    });

    disciplines.forEach((discipline) => {
      const parent = floorMap.get(discipline.floorId.toString());
      if (!parent) return;
      const node = createNode(
        discipline._id.toString(),
        discipline.name,
        "discipline",
        parent.projectId,
        parent.projectRole,
        discipline.sortIndex ?? 0
      );
      disciplineMap.set(discipline._id.toString(), node);
      parent.children.push(node);
    });

    drawings.forEach((drawing) => {
      const parent = disciplineMap.get(drawing.disciplineId.toString());
      if (!parent) return;
      const node = createNode(
        drawing._id.toString(),
        drawing.name,
        "drawing",
        parent.projectId,
        parent.projectRole,
        drawing.sortIndex ?? 0
      );
      drawingMap.set(drawing._id.toString(), node);
      parent.children.push(node);
    });

    tasks.forEach((task) => {
      const parent = drawingMap.get(task.drawingId.toString());
      if (!parent) return;
      const node = createNode(
        task._id.toString(),
        task.pinName ?? task.pinCode,
        "task",
        parent.projectId,
        parent.projectRole
      );
      parent.children.push(node);
    });

    const tree = Array.from(projectMap.values());
    sortTree(tree);
    return sendSuccess(res, tree);
  })
);

router.post(
  "/reorder",
  requireAuth,
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const { nodeType, nodeId, direction } = req.body as {
      nodeType: NodeType;
      nodeId: string;
      direction: "up" | "down";
    };

    let siblings: Array<{ _id: { toString: () => string }; sortIndex?: number; save: () => Promise<unknown> }> = [];

    if (nodeType === "project") {
      const current = await ProjectModel.findById(nodeId);
      ensureProjectRole(current, req.user!.id, "admin", "Project khong ton tai hoac khong co quyen");
      siblings = await ProjectModel.find(buildAdminProjectFilter(req.user!.id)).sort({ sortIndex: 1, createdAt: 1 });
    } else if (nodeType === "building") {
      const current = await BuildingModel.findById(nodeId);
      if (!current) throw errors.notFound("Building khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );
      siblings = await BuildingModel.find({ projectId: current.projectId }).sort({ sortIndex: 1, createdAt: 1 });
    } else if (nodeType === "floor") {
      const current = await FloorModel.findById(nodeId);
      if (!current) throw errors.notFound("Floor khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );
      siblings = await FloorModel.find({ buildingId: current.buildingId }).sort({ sortIndex: 1, createdAt: 1 });
    } else if (nodeType === "discipline") {
      const current = await DisciplineModel.findById(nodeId);
      if (!current) throw errors.notFound("Discipline khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );
      siblings = await DisciplineModel.find({ floorId: current.floorId }).sort({ sortIndex: 1, createdAt: 1 });
    } else {
      const current = await DrawingModel.findById(nodeId);
      if (!current) throw errors.notFound("Drawing khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );
      siblings = await DrawingModel.find({ disciplineId: current.disciplineId }).sort({ sortIndex: 1, createdAt: 1 });
    }

    if (siblings.length < 2) {
      return sendSuccess(res, { moved: false });
    }

    await normalizeSiblingOrder(siblings);
    const currentIndex = siblings.findIndex((item) => item._id.toString() === nodeId);
    if (currentIndex < 0) throw errors.notFound("Node khong ton tai");

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return sendSuccess(res, { moved: false });
    }

    const current = siblings[currentIndex];
    const target = siblings[targetIndex];
    const currentSort = current.sortIndex ?? currentIndex + 1;
    const targetSort = target.sortIndex ?? targetIndex + 1;

    current.sortIndex = targetSort;
    target.sortIndex = currentSort;
    await Promise.all([current.save(), target.save()]);

    return sendSuccess(res, { moved: true });
  })
);

router.post(
  "/duplicate",
  requireAuth,
  validate(duplicateSchema),
  asyncHandler(async (req, res) => {
    const { nodeType, nodeId } = req.body as { nodeType: NodeType; nodeId: string };

    if (nodeType === "project") {
      const current = await ProjectModel.findById(nodeId);
      ensureProjectRole(current, req.user!.id, "admin", "Project khong ton tai hoac khong co quyen");

      const name = toCopyName(current!.name);
      const code = await buildUniqueProjectCode(req.user!.id, name);
      const sortIndex = await getNextSortIndex(ProjectModel, { userId: req.user!.id });

      const duplicated = await ProjectModel.create({
        userId: req.user!.id,
        members: [
          {
            userId: req.user!.id,
            role: "admin",
            addedBy: req.user!.id
          }
        ],
        name,
        code,
        description: current!.description,
        sortIndex
      });
      return sendSuccess(res, duplicated, {}, 201);
    }

    if (nodeType === "building") {
      const current = await BuildingModel.findById(nodeId);
      if (!current) throw errors.notFound("Building khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );

      const name = toCopyName(current.name);
      const sortIndex = await getNextSortIndex(BuildingModel, { projectId: current.projectId });
      const duplicated = await BuildingModel.create({
        projectId: current.projectId,
        name,
        code: toCode(name, 3),
        sortIndex
      });
      return sendSuccess(res, duplicated, {}, 201);
    }

    if (nodeType === "floor") {
      const current = await FloorModel.findById(nodeId);
      if (!current) throw errors.notFound("Floor khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );

      const name = toCopyName(current.name);
      const sortIndex = await getNextSortIndex(FloorModel, { buildingId: current.buildingId });
      const duplicated = await FloorModel.create({
        projectId: current.projectId,
        buildingId: current.buildingId,
        name,
        code: toCode(name, 3),
        level: current.level,
        sortIndex
      });
      return sendSuccess(res, duplicated, {}, 201);
    }

    if (nodeType === "discipline") {
      const current = await DisciplineModel.findById(nodeId);
      if (!current) throw errors.notFound("Discipline khong ton tai");
      ensureProjectRole(
        await ProjectModel.findById(current.projectId),
        req.user!.id,
        "admin",
        "Khong co quyen"
      );

      const name = toCopyName(current.name);
      const sortIndex = await getNextSortIndex(DisciplineModel, { floorId: current.floorId });
      const duplicated = await DisciplineModel.create({
        projectId: current.projectId,
        buildingId: current.buildingId,
        floorId: current.floorId,
        name,
        code: toCode(name, 3),
        sortIndex
      });
      return sendSuccess(res, duplicated, {}, 201);
    }

    const current = await DrawingModel.findById(nodeId);
    if (!current) throw errors.notFound("Drawing khong ton tai");
    ensureProjectRole(
      await ProjectModel.findById(current.projectId),
      req.user!.id,
      "admin",
      "Khong co quyen"
    );

    const name = toCopyName(current.name);
    const sortIndex = await getNextSortIndex(DrawingModel, { disciplineId: current.disciplineId });
    const duplicated = await DrawingModel.create({
      projectId: current.projectId,
      buildingId: current.buildingId,
      floorId: current.floorId,
      disciplineId: current.disciplineId,
      name,
      sortIndex,
      originalName: current.originalName,
      storageKey: current.storageKey,
      mimeType: current.mimeType,
      size: current.size
    });
    return sendSuccess(res, duplicated, {}, 201);
  })
);

export default router;
