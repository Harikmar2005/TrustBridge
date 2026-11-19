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
  logoutUser,
  type AuthUser,
} from "../services/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  socket: Socket | null;
  socketConnected: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

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

    const client = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    client.on("connect", () => {
      setSocket(client);
      setSocketConnected(true);
    });

    client.on("disconnect", () => {
      setSocketConnected(false);
    });

    client.on("connect_error", () => {
      setSocketConnected(false);
    });

    return () => {
      client.disconnect();
      setSocket(null);
      setSocketConnected(false);
    };
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        socket: user ? socket : null,
        socketConnected: Boolean(user && socketConnected),
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
