import { useApi } from "./useApi";

export type ProjectRole = "admin" | "technician";
export type ProjectTreeNodeType = "project" | "building" | "floor" | "discipline" | "drawing" | "task";
export type ProjectTreeNodeMetadata = {
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

export type ProjectTreeNode = {
  id: string;
  name: string;
  type: ProjectTreeNodeType;
  parentId: string | null;
  parentType: ProjectTreeNodeType | null;
  sortIndex: number;
  projectId: string;
  projectRole: ProjectRole;
  canManageStructure: boolean;
  canManageDrawings: boolean;
  canManageTasks: boolean;
  drawingCode?: string;
  versionIndex?: number;
  metadata: ProjectTreeNodeMetadata;
};

type ProjectTreeResponse = {
  nodes: ProjectTreeNode[];
  rootIds: string[];
};

type LegacyProjectTreeNode = {
  id: string;
  name: string;
  type: ProjectTreeNodeType;
  projectId: string;
  projectRole: ProjectRole;
  canManageStructure: boolean;
  canManageDrawings?: boolean;
  canManageTasks?: boolean;
  drawingCode?: string;
  versionIndex?: number;
  children?: LegacyProjectTreeNode[];
};

const compareNodes = (a: ProjectTreeNode, b: ProjectTreeNode) => {
  const indexA = Number.isFinite(a.sortIndex) ? a.sortIndex : 0;
  const indexB = Number.isFinite(b.sortIndex) ? b.sortIndex : 0;
  if (indexA !== indexB) return indexA - indexB;
  return a.name.localeCompare(b.name, "vi");
};

const isTreeResponse = (payload: unknown): payload is ProjectTreeResponse => {
  if (!payload || typeof payload !== "object") return false;
  const raw = payload as { nodes?: unknown; rootIds?: unknown };
  return Array.isArray(raw.nodes) && Array.isArray(raw.rootIds);
};

const normalizeTreePayload = (payload: unknown): ProjectTreeResponse => {
  if (isTreeResponse(payload)) {
    return {
      nodes: (payload.nodes || []) as ProjectTreeNode[],
      rootIds: (payload.rootIds || []) as string[]
    };
  }

  const legacyTree = Array.isArray(payload) ? (payload as LegacyProjectTreeNode[]) : [];
  const nodes: ProjectTreeNode[] = [];
  const rootIds: string[] = [];

  const walk = (
    node: LegacyProjectTreeNode,
    parentId: string | null,
    parentType: ProjectTreeNodeType | null,
    siblingIndex: number
  ) => {
    const current: ProjectTreeNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId,
      parentType,
      sortIndex: siblingIndex + 1,
      projectId: node.projectId,
      projectRole: node.projectRole,
      canManageStructure: node.canManageStructure,
      canManageDrawings: node.canManageDrawings ?? false,
      canManageTasks: node.canManageTasks ?? false,
      drawingCode: node.drawingCode,
      versionIndex: node.versionIndex,
      metadata: {}
    };
    nodes.push(current);
    if (!parentId) {
      rootIds.push(node.id);
    }
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => {
      walk(child, node.id, node.type, index);
    });
  };

  legacyTree.forEach((node, index) => {
    walk(node, null, null, index);
  });

  return { nodes, rootIds };
};

export const useProjectTree = () => {
  const nodes = useState<ProjectTreeNode[]>("project-tree-nodes", () => []);
  const rootIds = useState<string[]>("project-tree-root-ids", () => []);
  const loading = useState<boolean>("project-tree-loading", () => false);
  const error = useState<string>("project-tree-error", () => "");

  const nodeMap = computed(() => {
    const map = new Map<string, ProjectTreeNode>();
    for (const node of nodes.value) {
      map.set(node.id, node);
    }
    return map;
  });

  const childrenByParentId = computed(() => {
    const map = new Map<string, ProjectTreeNode[]>();
    for (const node of nodes.value) {
      if (!node.parentId) continue;
      const siblings = map.get(node.parentId) || [];
      siblings.push(node);
      map.set(node.parentId, siblings);
    }
    map.forEach((siblings) => siblings.sort(compareNodes));
    return map;
  });

  const roots = computed(() => {
    const map = nodeMap.value;
    const resolvedRoots = rootIds.value
      .map((id) => map.get(id))
      .filter((node): node is ProjectTreeNode => !!node);
    return resolvedRoots.sort(compareNodes);
  });

  const getNodeById = (nodeId: string) => {
    if (!nodeId) return null;
    return nodeMap.value.get(nodeId) || null;
  };

  const fetchTree = async () => {
    loading.value = true;
    error.value = "";
    try {
      const api = useApi();
      const payload = await api.get<ProjectTreeResponse | LegacyProjectTreeNode[]>("/project-tree");
      const normalized = normalizeTreePayload(payload);
      nodes.value = normalized.nodes || [];
      rootIds.value = normalized.rootIds || [];
    } catch (err) {
      error.value = (err as Error).message;
      nodes.value = [];
      rootIds.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    nodes,
    rootIds,
    roots,
    nodeMap,
    childrenByParentId,
    loading,
    error,
    fetchTree,
    getNodeById
  };
};
