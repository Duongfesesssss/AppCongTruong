import type { ProjectRole } from "~/composables/api/useProjectTree";

export type SelectedNode = {
  id: string;
  name: string;
  type: string;
  projectId?: string;
  projectRole?: ProjectRole;
  canManageStructure?: boolean;
} | null;

export const useSelectedNode = () => {
  return useState<SelectedNode>("selected-node", () => null);
};
