import { useApi } from "~/composables/api/useApi";

export type AuthUser = {
  id: string;
  name?: string;
  email: string;
};

export const useAuth = () => {
  const token = useState<string | null>("auth-token", () => null);
  const user = useState<AuthUser | null>("auth-user", () => null);
  const loading = useState<boolean>("auth-loading", () => false);
  const error = useState<string>("auth-error", () => "");

  // Reset loading state khi khởi tạo (đề phòng bị stuck)
  if (process.client) {
    loading.value = false;
  }

  const setToken = (value: string | null) => {
    token.value = value;
    if (process.client) {
      if (value) {
        localStorage.setItem("accessToken", value);
      } else {
        localStorage.removeItem("accessToken");
      }
    }
  };

  const setUser = (value: AuthUser | null) => {
    user.value = value;
  };

  const initFromStorage = async () => {
    if (!process.client) return;
    const stored = localStorage.getItem("accessToken");
    if (stored) {
      token.value = stored;
      await fetchMe();
    }
  };

  const login = async (email: string, password: string) => {
    loading.value = true;
    error.value = "";
    try {
      const api = useApi();
      const result = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
        email,
        password
      });
      setToken(result.accessToken);
      setUser(result.user);
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    loading.value = true;
    error.value = "";
    try {
      const api = useApi();
      const result = await api.post<{ accessToken: string; user: AuthUser }>("/auth/register", {
        name,
        email,
        password
      });
      setToken(result.accessToken);
      setUser(result.user);
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      const api = useApi();
      await api.post("/auth/logout", {});
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  };

  const fetchMe = async () => {
    if (!token.value) return;
    try {
      const api = useApi();
      const result = await api.get<{ user: AuthUser }>("/auth/me");
      setUser(result.user);
    } catch {
      setToken(null);
      setUser(null);
    }
  };

  return { token, user, loading, error, login, register, logout, fetchMe, initFromStorage };
};
