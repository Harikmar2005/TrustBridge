import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  getCurrentUser,
  getStoredAuthToken,
  logoutUser,
  setStoredAuthToken,
  type AuthUser,
} from "../services/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  socket: Socket | null;
  refreshUser: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        return res.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getCurrentUser();
        if (!active) return;
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const handleUnauthorized = () => {
      setStoredAuthToken(null);
      setUser(null);
    };
    window.addEventListener("tb:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener("tb:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const token = getStoredAuthToken();
    const client = io({
      withCredentials: true,
      ...(token ? { auth: { token } } : {}),
      transports: ["websocket", "polling"],
    });

    client.on("connect", () => {
      setSocket(client);
    });

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setStoredAuthToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        socket: user ? socket : null,
        refreshUser,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
