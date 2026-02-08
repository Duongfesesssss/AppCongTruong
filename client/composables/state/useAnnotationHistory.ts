export type MeasurementHistory = {
  id: string;
  photoId: string;
  pixelDistance: number;
  realDistance: string;
  timestamp: number;
  color?: string;
  width?: number;
};

const STORAGE_KEY = "photo-annotator-history";
const MAX_ENTRIES = 100;

export const useAnnotationHistory = () => {
  const history = useState<MeasurementHistory[]>("annotation-history", () => []);

  // Load from localStorage on first use
  const loadHistory = () => {
    if (process.client && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            history.value = parsed;
          }
        }
      } catch (err) {
        console.error("Failed to load history from localStorage:", err);
        history.value = [];
      }
    }
  };

  // Save to localStorage
  const saveHistory = () => {
    if (process.client && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
      } catch (err) {
        console.error("Failed to save history to localStorage:", err);
      }
    }
  };

  // Add new measurement
  const addMeasurement = (item: MeasurementHistory) => {
    // Load first if not loaded
    if (history.value.length === 0) {
      loadHistory();
    }

    // Add to beginning (most recent first)
    history.value.unshift(item);

    // Limit to MAX_ENTRIES
    if (history.value.length > MAX_ENTRIES) {
      history.value = history.value.slice(0, MAX_ENTRIES);
    }

    saveHistory();
  };

  // Get recent measurements globally (across all photos)
  const getRecentGlobal = (limit: number = 6): MeasurementHistory[] => {
    if (history.value.length === 0) {
      loadHistory();
    }
    return history.value.slice(0, limit);
  };

  // Get recent measurements for specific photo
  const getRecentByPhoto = (photoId: string, limit: number = 10): MeasurementHistory[] => {
    if (history.value.length === 0) {
      loadHistory();
    }
    return history.value.filter((item) => item.photoId === photoId).slice(0, limit);
  };

  // Clear all history
  const clearHistory = () => {
    history.value = [];
    if (process.client && typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    }
  };

  // Auto-load on first access
  if (history.value.length === 0) {
    loadHistory();
  }

  return {
    history,
    addMeasurement,
    getRecentGlobal,
    getRecentByPhoto,
    clearHistory
  };
};
