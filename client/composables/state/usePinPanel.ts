export const usePinPanel = () => {
  const open = useState("pin-panel-open", () => false);
  return { open };
};
