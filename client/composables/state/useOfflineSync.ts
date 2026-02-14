import { useToast } from "~/composables/state/useToast";

type OfflineMethod = "POST" | "PUT" | "PATCH" | "DELETE";

type QueueFormEntry =
  | { key: string; kind: "text"; value: string }
  | { key: string; kind: "file"; value: File };

type OfflineQueueItem = {
  id: string;
  idempotencyKey: string;
  method: OfflineMethod;
  path: string;
  bodyType: "none" | "json" | "form-data";
  jsonBody?: unknown;
  formEntries?: QueueFormEntry[];
  createdAt: number;
  retryCount: number;
  lastError?: string;
};

type ApiFailure = {
  success: false;
  error?: { code?: string; message?: string };
};

export type QueuedRequestResult = {
  queueId: string;
  queuedAt: number;
  method: OfflineMethod;
  path: string;
  idempotencyKey: string;
};

const DB_NAME = "appcongtruong-offline";
const DB_VERSION = 1;
const STORE_NAME = "outbox";
const OFFLINE_ALLOWLIST = ["/tasks", "/photos", "/zones"];

const toRequestError = (fallback: string, source?: unknown) =>
  source instanceof Error ? source : new Error(fallback);

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toRequestError("Loi IndexedDB", request.error ?? undefined));
  });

const txToPromise = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toRequestError("Loi transaction IndexedDB", tx.error ?? undefined));
    tx.onabort = () => reject(toRequestError("Transaction IndexedDB bi huy", tx.error ?? undefined));
  });

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!process.client || typeof indexedDB === "undefined") {
      reject(new Error("Trinh duyet khong ho tro IndexedDB"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toRequestError("Khong mo duoc IndexedDB", request.error ?? undefined));
  });

const normalizePath = (path: string) => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

const matchesAllowlist = (path: string) => {
  const normalized = normalizePath(path).split("?")[0];
  return OFFLINE_ALLOWLIST.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
};

const serializeFormData = (value: FormData): QueueFormEntry[] => {
  const entries: QueueFormEntry[] = [];
  value.forEach((entryValue, entryKey) => {
    if (entryValue instanceof File) {
      entries.push({ key: entryKey, kind: "file", value: entryValue });
      return;
    }
    entries.push({ key: entryKey, kind: "text", value: String(entryValue) });
  });
  return entries;
};

const deserializeFormData = (entries: QueueFormEntry[] = []) => {
  const formData = new FormData();
  for (const entry of entries) {
    if (entry.kind === "file") {
      formData.append(entry.key, entry.value, entry.value.name);
      continue;
    }
    formData.append(entry.key, entry.value);
  }
  return formData;
};

const createQueueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createIdempotencyKey = () => {
  if (process.client && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${createQueueId()}`;
};

const isNetworkError = (value: unknown) => {
  if (!(value instanceof Error)) return false;
  return /network|failed to fetch|load failed/i.test(value.message) || value.name === "TypeError";
};

const runWithStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>
) => {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await fn(store);
    await txToPromise(tx);
    return result;
  } finally {
    db.close();
  }
};

const listQueueItems = async () =>
  runWithStore("readonly", async (store) => {
    const index = store.index("createdAt");
    const result = await requestToPromise(index.getAll());
    return (result as OfflineQueueItem[]) ?? [];
  });

const countQueueItems = async () =>
  runWithStore("readonly", async (store) => {
    const result = await requestToPromise(store.count());
    return typeof result === "number" ? result : 0;
  });

const putQueueItem = async (item: OfflineQueueItem) =>
  runWithStore("readwrite", async (store) => {
    await requestToPromise(store.put(item));
  });

const deleteQueueItem = async (id: string) =>
  runWithStore("readwrite", async (store) => {
    await requestToPromise(store.delete(id));
  });

export const useOfflineSync = () => {
  const config = useRuntimeConfig();
  const token = useState<string | null>("auth-token", () => null);
  const isOnline = useState<boolean>("offline-network-online", () =>
    process.client ? navigator.onLine : true
  );
  const pendingCount = useState<number>("offline-outbox-pending-count", () => 0);
  const isSyncing = useState<boolean>("offline-outbox-syncing", () => false);
  const initialized = useState<boolean>("offline-outbox-initialized", () => false);
  const lastSyncError = useState<string>("offline-outbox-last-error", () => "");
  const toast = process.client ? useToast() : null;

  const refreshPendingCount = async () => {
    if (!process.client) return;
    try {
      pendingCount.value = await countQueueItems();
    } catch {
      pendingCount.value = 0;
    }
  };

  const canQueueRequest = (method: string, path: string) => {
    if (!process.client) return false;
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
    if (path.startsWith("/auth")) return false;
    return matchesAllowlist(path);
  };

  const enqueueRequest = async (
    method: OfflineMethod,
    path: string,
    body: unknown,
    idempotencyKey?: string
  ): Promise<QueuedRequestResult> => {
    if (!process.client) {
      throw new Error("Khong the luu tam request tren server");
    }
    const queueId = createQueueId();
    const createdAt = Date.now();

    let bodyType: OfflineQueueItem["bodyType"] = "none";
    let jsonBody: unknown;
    let formEntries: QueueFormEntry[] | undefined;

    if (body instanceof FormData) {
      bodyType = "form-data";
      formEntries = serializeFormData(body);
    } else if (body !== undefined) {
      bodyType = "json";
      jsonBody = body;
    }

    const item: OfflineQueueItem = {
      id: queueId,
      idempotencyKey: idempotencyKey || createIdempotencyKey(),
      method,
      path: normalizePath(path),
      bodyType,
      jsonBody,
      formEntries,
      createdAt,
      retryCount: 0
    };

    await putQueueItem(item);
    await refreshPendingCount();

    return {
      queueId: item.id,
      queuedAt: item.createdAt,
      method: item.method,
      path: item.path,
      idempotencyKey: item.idempotencyKey
    };
  };

  const syncItem = async (item: OfflineQueueItem) => {
    const headers: Record<string, string> = {
      "X-Idempotency-Key": item.idempotencyKey
    };
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`;
    }

    const options: RequestInit = {
      method: item.method,
      headers,
      credentials: "include"
    };

    if (item.bodyType === "json") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(item.jsonBody ?? {});
    } else if (item.bodyType === "form-data") {
      options.body = deserializeFormData(item.formEntries);
    }

    const response = await fetch(`${config.public.apiBase}${item.path}`, options);
    let payload: ApiFailure | null = null;
    try {
      payload = (await response.json()) as ApiFailure;
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      const errorMessage =
        payload?.error?.message || `Dong bo that bai (${response.status})`;
      throw new Error(errorMessage);
    }
  };

  const syncNow = async () => {
    if (!process.client || isSyncing.value || !isOnline.value) return;
    isSyncing.value = true;
    lastSyncError.value = "";

    let syncedItems = 0;
    try {
      const items = await listQueueItems();
      for (const item of items) {
        if (!isOnline.value) break;
        try {
          await syncItem(item);
          await deleteQueueItem(item.id);
          syncedItems += 1;
        } catch (err) {
          if (isNetworkError(err)) {
            isOnline.value = false;
            break;
          }

          const message = (err as Error).message || "Loi dong bo";
          lastSyncError.value = message;
          await putQueueItem({
            ...item,
            retryCount: item.retryCount + 1,
            lastError: message
          });
          break;
        }
      }
    } finally {
      await refreshPendingCount();
      isSyncing.value = false;
    }

    if (syncedItems > 0) {
      toast?.push(`Da dong bo ${syncedItems} thao tac offline`, "success");
    }
    if (lastSyncError.value) {
      toast?.push(`Dong bo tam dung: ${lastSyncError.value}`, "error");
    }
  };

  const init = async () => {
    if (!process.client || initialized.value) return;

    isOnline.value = navigator.onLine;
    window.addEventListener("online", () => {
      isOnline.value = true;
      syncNow().catch(() => undefined);
    });
    window.addEventListener("offline", () => {
      isOnline.value = false;
    });

    initialized.value = true;
    await refreshPendingCount();
    if (isOnline.value && pendingCount.value > 0) {
      await syncNow();
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError,
    isNetworkError,
    canQueueRequest,
    enqueueRequest,
    refreshPendingCount,
    syncNow,
    init
  };
};
