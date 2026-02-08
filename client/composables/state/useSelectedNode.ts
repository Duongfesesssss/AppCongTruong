export type SelectedNode = {
  id: string;
  name: string;
  type: string;
} | null;

export const useSelectedNode = () => {
  return useState<SelectedNode>("selected-node", () => null);
};
