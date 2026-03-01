export type PlanViewState = {
  drawingId?: string;
  taskId?: string;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  updatedAt: number;
};

export const usePlanViewState = () => {
  return useState<PlanViewState>("plan-view-state", () => ({
    updatedAt: 0
  }));
};
