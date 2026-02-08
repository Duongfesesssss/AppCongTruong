export type Toast = {
  id: string;
  message: string;
  type: "info" | "success" | "error";
};

export const useToast = () => {
  const toasts = useState<Toast[]>("toasts", () => []);

  const remove = (id: string) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  const push = (message: string, type: Toast["type"] = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    toasts.value.push({ id, message, type });
    setTimeout(() => remove(id), 3500);
  };

  return { toasts, push, remove };
};
