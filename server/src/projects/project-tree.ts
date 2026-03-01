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
type TreeNodeType = NodeType | "task";

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

type FlatTreeNodeMetadata = {
  buildingId?: string;
  floorId?: string;
  disciplineId?: string;
  drawingId?: string;
  taskId?: string;
  pinCode?: string;
  status?: string;
  category?: string;
  tagNames?: string[];
};

type FlatTreeNode = {
  id: string;
  name: string;
  type: TreeNodeType;
  parentId: string | null;
  parentType: TreeNodeType | null;
  sortIndex: number;
  projectId: string;
  projectRole: ProjectMemberRole;
  canManageStructure: boolean;
  drawingCode?: string;
  versionIndex?: number;
  metadata: FlatTreeNodeMetadata;
};

const createNode = (
  id: string,
  name: string,
  type: TreeNodeType,
  parentId: string | null,
  parentType: TreeNodeType | null,
  projectId: string,
  projectRole: ProjectMemberRole,
  sortIndex = 0,
  extras: Partial<Pick<FlatTreeNode, "drawingCode" | "versionIndex" | "metadata">> = {}
): FlatTreeNode => ({
  id,
  name,
  type,
  parentId,
  parentType,
  sortIndex,
  projectId,
  projectRole,
  canManageStructure: projectRole === "admin",
  ...extras,
  metadata: extras.metadata ?? {}
});

const compareNodes = (a: FlatTreeNode, b: FlatTreeNode) => {
  const indexA = Number.isFinite(a.sortIndex) ? a.sortIndex : 0;
  const indexB = Number.isFinite(b.sortIndex) ? b.sortIndex : 0;
  if (indexA !== indexB) return indexA - indexB;
  return a.name.localeCompare(b.name, "vi");
};

const orderFlatNodes = (nodes: FlatTreeNode[]) => {
  const nodeMap = new Map<string, FlatTreeNode>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  const childrenMap = new Map<string | null, FlatTreeNode[]>();
  nodes.forEach((node) => {
    const parentKey = node.parentId && nodeMap.has(node.parentId) ? node.parentId : null;
    const siblings = childrenMap.get(parentKey) || [];
    siblings.push(node);
    childrenMap.set(parentKey, siblings);
  });

  childrenMap.forEach((siblings) => {
    siblings.sort(compareNodes);
  });

  const orderedNodes: FlatTreeNode[] = [];
  const rootNodes = childrenMap.get(null) || [];

  const visit = (node: FlatTreeNode) => {
    orderedNodes.push(node);
    const children = childrenMap.get(node.id) || [];
    children.forEach(visit);
  };

  rootNodes.forEach(visit);

  return {
    nodes: orderedNodes,
    rootIds: rootNodes.map((node) => node.id)
  };
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

const buildStandardizedDrawingFileName = (drawingCode: string, mimeType: string, fallbackOriginalName: string) => {
  const safeCode =
    drawingCode
      .toUpperCase()
      .replace(/[^A-Z0-9.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "DRAWING";

  if (mimeType === "application/pdf") {
    return `${safeCode}.pdf`;
  }

  const ext = (fallbackOriginalName || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ".bin";
  return `${safeCode}${ext}`;
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
    const projects = await ProjectModel.find(buildProjectAccessFilter(req.user!.id))
      .sort({ sortIndex: 1, createdAt: 1 })
      .lean();
    const projectsWithRole = projects
      .map((project) => ({
        project,
        role: getProjectRole(project, req.user!.id)
      }))
      .filter((item): item is { project: (typeof projects)[number]; role: ProjectMemberRole } => !!item.role);

    const projectIds = projectsWithRole.map((item) => item.project._id);
    if (projectIds.length === 0) {
      return sendSuccess(res, { nodes: [], rootIds: [] });
    }

    const [drawings, tasks] = await Promise.all([
      DrawingModel.find({
        projectId: { $in: projectIds },
        $or: [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }]
      })
        .sort({ sortIndex: 1, createdAt: 1 })
        .lean(),
      TaskModel.find({ projectId: { $in: projectIds } }).sort({ createdAt: 1 }).lean()
    ]);

    const nodes: FlatTreeNode[] = [];
    const projectMap = new Map<string, FlatTreeNode>();
    const drawingMap = new Map<string, FlatTreeNode>();

    projectsWithRole.forEach(({ project, role }) => {
      const projectId = project._id.toString();
      const node = createNode(projectId, project.name, "project", null, null, projectId, role, project.sortIndex ?? 0);
      projectMap.set(projectId, node);
      nodes.push(node);
    });

    drawings.forEach((drawing) => {
      const parent = projectMap.get(drawing.projectId.toString());
      if (!parent) return;
      const drawingId = drawing._id.toString();
      const node = createNode(
        drawingId,
        drawing.name,
        "drawing",
        parent.id,
        "project",
        parent.projectId,
        parent.projectRole,
        drawing.sortIndex ?? 0,
        {
          drawingCode: drawing.drawingCode,
          versionIndex: drawing.versionIndex ?? 1,
          metadata: {
            buildingId: drawing.buildingId ? drawing.buildingId.toString() : undefined,
            floorId: drawing.floorId ? drawing.floorId.toString() : undefined,
            disciplineId: drawing.disciplineId ? drawing.disciplineId.toString() : undefined,
            drawingId,
            tagNames: drawing.tagNames || []
          }
        }
      );
      drawingMap.set(drawingId, node);
      nodes.push(node);
    });

    tasks.forEach((task) => {
      const parent = drawingMap.get(task.drawingId.toString());
      if (!parent) return;
      const taskId = task._id.toString();
      const node = createNode(
        taskId,
        task.pinName ?? task.pinCode,
        "task",
        parent.id,
        "drawing",
        parent.projectId,
        parent.projectRole,
        0,
        {
          metadata: {
            buildingId: task.buildingId ? task.buildingId.toString() : undefined,
            floorId: task.floorId ? task.floorId.toString() : undefined,
            disciplineId: task.disciplineId ? task.disciplineId.toString() : undefined,
            drawingId: task.drawingId.toString(),
            taskId,
            pinCode: task.pinCode,
            status: task.status,
            category: task.category,
            tagNames: task.tagNames || []
          }
        }
      );
      nodes.push(node);
    });

    return sendSuccess(res, orderFlatNodes(nodes));
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
      siblings = await DrawingModel.find({
        projectId: current.projectId,
        $or: [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }]
      }).sort({ sortIndex: 1, createdAt: 1 });
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

      // Deep clone structure only: building -> floor -> discipline.
      // Do not clone drawings/tasks to avoid noisy copied data.
      const [sourceBuildings, sourceFloors, sourceDisciplines] = await Promise.all([
        BuildingModel.find({ projectId: current!._id }).sort({ sortIndex: 1, createdAt: 1 }),
        FloorModel.find({ projectId: current!._id }).sort({ sortIndex: 1, createdAt: 1 }),
        DisciplineModel.find({ projectId: current!._id }).sort({ sortIndex: 1, createdAt: 1 })
      ]);

      const buildingIdMap = new Map<string, string>();
      for (const source of sourceBuildings) {
        const cloned = await BuildingModel.create({
          projectId: duplicated._id,
          name: source.name,
          code: source.code,
          sortIndex: source.sortIndex ?? 0
        });
        buildingIdMap.set(source._id.toString(), cloned._id.toString());
      }

      const floorIdMap = new Map<string, string>();
      for (const source of sourceFloors) {
        const clonedBuildingId = buildingIdMap.get(source.buildingId.toString());
        if (!clonedBuildingId) continue;
        const cloned = await FloorModel.create({
          projectId: duplicated._id,
          buildingId: clonedBuildingId,
          name: source.name,
          code: source.code,
          level: source.level,
          sortIndex: source.sortIndex ?? 0
        });
        floorIdMap.set(source._id.toString(), cloned._id.toString());
      }

      for (const source of sourceDisciplines) {
        const clonedBuildingId = buildingIdMap.get(source.buildingId.toString());
        const clonedFloorId = floorIdMap.get(source.floorId.toString());
        if (!clonedBuildingId || !clonedFloorId) continue;
        await DisciplineModel.create({
          projectId: duplicated._id,
          buildingId: clonedBuildingId,
          floorId: clonedFloorId,
          name: source.name,
          code: source.code,
          sortIndex: source.sortIndex ?? 0
        });
      }

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
    const sortIndex = await getNextSortIndex(DrawingModel, { projectId: current.projectId });
    let drawingCode = `${current.drawingCode}-COPY`;
    let copyCounter = 2;
    while (
      await DrawingModel.exists({
        projectId: current.projectId,
        drawingCode,
        $or: [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }]
      })
    ) {
      drawingCode = `${current.drawingCode}-COPY-${copyCounter}`;
      copyCounter += 1;
    }
    const duplicatedOriginalName = buildStandardizedDrawingFileName(
      drawingCode,
      current.mimeType,
      current.originalName
    );
    const duplicated = await DrawingModel.create({
      projectId: current.projectId,
      buildingId: current.buildingId,
      floorId: current.floorId,
      disciplineId: current.disciplineId,
      name,
      drawingCode,
      versionIndex: 1,
      isLatestVersion: true,
      parsedMetadata: current.parsedMetadata,
      tagNames: current.tagNames,
      sortIndex,
      originalName: duplicatedOriginalName,
      storageKey: current.storageKey,
      mimeType: current.mimeType,
      size: current.size
    });
    return sendSuccess(res, duplicated, {}, 201);
  })
);

export default router;
