type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
};

const isFormData = (value: unknown) => {
  if (!process.client) return false;
  return value instanceof FormData;
};

export const useApi = () => {
  const config = useRuntimeConfig();
  // Đọc trực tiếp từ useState để tránh circular dependency với useAuth
  const token = useState<string | null>("auth-token", () => null);
  const user = useState<unknown | null>("auth-user", () => null);

  // Tránh gọi refresh nhiều lần cùng lúc
  let refreshPromise: Promise<boolean> | null = null;

  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${config.public.apiBase}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Gửi httpOnly cookie chứa refresh token
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

  const request = async <T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    _isRetry = false
  ): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token.value) headers.Authorization = `Bearer ${token.value}`;

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
      const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

      if (!response.ok || !payload.success) {
        const code = "error" in payload ? payload.error.code : "";
        const message =
          "error" in payload ? payload.error.message : "Co loi xay ra";

        // Nếu 401 và chưa retry → thử refresh token rồi gọi lại
        if (code === "UNAUTHORIZED" && !_isRetry && path !== "/auth/refresh") {
          if (!refreshPromise) {
            refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
          }
          const refreshed = await refreshPromise;
          if (refreshed) {
            return request<T>(method, path, body, true);
          }
          // Refresh thất bại → logout
          token.value = null;
          user.value = null;
          if (process.client) {
            localStorage.removeItem("accessToken");
            navigateTo("/login");
          }
        }
        throw new Error(message);
      }

      return (payload as ApiSuccess<T>).data;
    } catch (err) {
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
