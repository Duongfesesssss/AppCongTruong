export type DeepLinkFocusPayload = {
  drawingId: string;
  taskId?: string;
  pinX?: number;
  pinY?: number;
  zoom?: number;
  requestedAt: number;
};

export const useDeepLinkFocus = () => {
  const pending = useState<DeepLinkFocusPayload | null>("deep-link-focus", () => null);

  const setDeepLinkFocus = (payload: Omit<DeepLinkFocusPayload, "requestedAt">) => {
    pending.value = {
      ...payload,
      requestedAt: Date.now()
    };
  };

  const clearDeepLinkFocus = () => {
    pending.value = null;
  };

  return {
    pending,
    setDeepLinkFocus,
    clearDeepLinkFocus
  };
};
