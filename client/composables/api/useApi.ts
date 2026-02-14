import { useOfflineSync, type QueuedRequestResult } from "~/composables/state/useOfflineSync";
import { useToast } from "~/composables/state/useToast";

type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiOfflineQueuedResult = {
  __offlineQueued: true;
  queueId: string;
  queuedAt: number;
  method: Exclude<HttpMethod, "GET">;
  path: string;
  idempotencyKey: string;
};

export const isOfflineQueuedResponse = (value: unknown): value is ApiOfflineQueuedResult => {
  return (
    !!value &&
    typeof value === "object" &&
    "__offlineQueued" in value &&
    (value as { __offlineQueued?: boolean }).__offlineQueued === true
  );
};

const isFormData = (value: unknown) => {
  if (!process.client) return false;
  return value instanceof FormData;
};

const isApiFailure = (value: unknown): value is ApiFailure => {
  if (!value || typeof value !== "object") return false;
  if (!("success" in value)) return false;
  return (value as { success?: boolean }).success === false;
};

const createRequestId = () => {
  if (process.client && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildOfflineQueuedResponse = (
  method: Exclude<HttpMethod, "GET">,
  queued: QueuedRequestResult
): ApiOfflineQueuedResult => ({
  __offlineQueued: true,
  queueId: queued.queueId,
  queuedAt: queued.queuedAt,
  method,
  path: queued.path,
  idempotencyKey: queued.idempotencyKey
});

export const useApi = () => {
  const config = useRuntimeConfig();
  const offlineSync = process.client ? useOfflineSync() : null;
  if (process.client && offlineSync) {
    offlineSync.init().catch(() => undefined);
  }

  // Doc truc tiep tu useState de tranh circular dependency voi useAuth
  const token = useState<string | null>("auth-token", () => null);
  const user = useState<unknown | null>("auth-user", () => null);
  const sessionWarningAt = useState<number>("auth-session-warning-at", () => 0);
  const toast = process.client ? useToast() : null;

  // Tranh goi refresh nhieu lan cung luc
  let refreshPromise: Promise<boolean> | null = null;

  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${config.public.apiBase}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Gui httpOnly cookie chua refresh token
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.accessToken) {
        token.value = data.data.accessToken;
        if (process.client) {
          localStorage.setItem("accessToken", data.data.accessToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const decodeTokenExpMs = (value: string) => {
    if (!process.client) return null;
    try {
      const parts = value.split(".");
      if (parts.length < 2) return null;
      const payloadRaw = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      const payloadText = atob(payloadRaw);
      const payload = JSON.parse(payloadText) as { exp?: number };
      if (!payload.exp) return null;
      return payload.exp * 1000;
    } catch {
      return null;
    }
  };

  const isTokenNearExpiry = (value: string, thresholdMs: number) => {
    const expMs = decodeTokenExpMs(value);
    if (!expMs) return false;
    return expMs - Date.now() <= thresholdMs;
  };

  const queueRequest = async <T>(
    method: Exclude<HttpMethod, "GET">,
    path: string,
    body: unknown,
    idempotencyKey: string
  ) => {
    if (!offlineSync) {
      throw new Error("Khong the luu tam thao tac offline");
    }
    const queued = await offlineSync.enqueueRequest(method, path, body, idempotencyKey);
    toast?.push("Mat mang: thao tac da luu tam va se tu dong bo", "info");
    return buildOfflineQueuedResponse(method, queued) as T;
  };

  const logoutClient = () => {
    token.value = null;
    user.value = null;
    if (process.client) {
      localStorage.removeItem("accessToken");
      navigateTo("/login");
    }
  };

  const request = async <T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    _isRetry = false
  ): Promise<T> => {
    const canQueue =
      process.client &&
      !!offlineSync &&
      method !== "GET" &&
      offlineSync.canQueueRequest(method, path);
    const idempotencyKey = canQueue ? createRequestId() : "";

    if (process.client && method === "GET" && offlineSync && !offlineSync.isOnline.value) {
      throw new Error("Ban dang offline. Khong the tai du lieu moi.");
    }

    if (canQueue && offlineSync && !offlineSync.isOnline.value) {
      return queueRequest<T>(
        method as Exclude<HttpMethod, "GET">,
        path,
        body,
        idempotencyKey
      );
    }

    if (
      token.value &&
      path !== "/auth/refresh" &&
      path !== "/auth/login" &&
      path !== "/auth/register" &&
      isTokenNearExpiry(token.value, 90_000)
    ) {
      if (process.client && Date.now() - sessionWarningAt.value > 60_000) {
        toast?.push("Phien dang nhap sap het han, he thong dang tu gia han", "info");
        sessionWarningAt.value = Date.now();
      }

      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (!refreshed) {
        logoutClient();
        throw new Error("Phien dang nhap da het han");
      }
    }

    const headers: Record<string, string> = {};
    if (token.value) headers.Authorization = `Bearer ${token.value}`;
    if (canQueue && idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: "include"
    };

    if (body !== undefined) {
      if (isFormData(body)) {
        options.body = body as FormData;
      } else {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(`${config.public.apiBase}${path}`, options);
      let payload: ApiSuccess<T> | ApiFailure | null = null;
      try {
        payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || isApiFailure(payload)) {
        const code = isApiFailure(payload) ? payload.error.code : "";
        const message = isApiFailure(payload)
          ? payload.error.message
          : `Yeu cau that bai (${response.status})`;

        // Neu 401 va chua retry -> thu refresh token roi goi lai
        if (code === "UNAUTHORIZED" && !_isRetry && path !== "/auth/refresh") {
          if (!refreshPromise) {
            refreshPromise = tryRefreshToken().finally(() => {
              refreshPromise = null;
            });
          }
          const refreshed = await refreshPromise;
          if (refreshed) {
            return request<T>(method, path, body, true);
          }
          // Refresh that bai -> logout
          logoutClient();
        }
        throw new Error(message);
      }

      return (payload as ApiSuccess<T>).data;
    } catch (err) {
      if (canQueue && offlineSync && offlineSync.isNetworkError(err)) {
        return queueRequest<T>(
          method as Exclude<HttpMethod, "GET">,
          path,
          body,
          idempotencyKey || createRequestId()
        );
      }
      const message = (err as Error).message || "Co loi xay ra";
      throw new Error(message);
    }
  };

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    del: <T>(path: string) => request<T>("DELETE", path),
    delete: <T>(path: string) => request<T>("DELETE", path), // alias for del
    upload: <T>(path: string, formData: FormData) => request<T>("POST", path, formData)
  };
};
