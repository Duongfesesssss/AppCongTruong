import { useApi } from "./useApi";

export type ProjectTreeNode = {
  id: string;
  name: string;
  type: string;
  children: ProjectTreeNode[];
};

export const useProjectTree = () => {
  const tree = useState<ProjectTreeNode[]>("project-tree", () => []);
  const loading = useState<boolean>("project-tree-loading", () => false);
  const error = useState<string>("project-tree-error", () => "");

  const fetchTree = async () => {
    loading.value = true;
    error.value = "";
    try {
      const api = useApi();
      tree.value = await api.get<ProjectTreeNode[]>("/api/project-tree");
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  return { tree, loading, error, fetchTree };
};
