import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Scale,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../services/api";
import Logo from "../components/common/Logo";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/sellers", label: "Seller Directory", icon: Store, end: false },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare, end: false },
  { to: "/dashboard/trust", label: "Trust Score", icon: ShieldCheck, end: false },
  { to: "/dashboard/security", label: "Security Alerts", icon: AlertTriangle, end: false },
  { to: "/dashboard/disputes", label: "Disputes", icon: Scale, end: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, end: false },
];

function getBreadcrumbTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/messages")) return "Messages";
  if (pathname.startsWith("/dashboard/trust")) return "Trust Score";
  if (pathname.startsWith("/dashboard/security")) return "Security Alerts";
  if (pathname.startsWith("/dashboard/disputes")) return "Disputes";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/sellers")) return "Seller Directory";
  return "Overview";
}

export default function DashboardLayout() {
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const res = await getNotifications();
      setNotifications((res.notifications as NotificationRecord[]) || []);
      setUnreadCount(Number(res.unreadCount || 0));
    } catch {
      // Non-blocking notification fetch
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await getNotifications();
        if (!active) return;
        setNotifications((res.notifications as NotificationRecord[]) || []);
        setUnreadCount(Number(res.unreadCount || 0));
      } catch {
        // Non-blocking notification fetch
      }
    })();
    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    if (!socket || !user) return;
    const onNew = () => {
      void getNotifications()
        .then((res) => {
          setNotifications((res.notifications as NotificationRecord[]) || []);
          setUnreadCount(Number(res.unreadCount || 0));
        })
        .catch(() => {});
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket, user]);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleMarkRead(n: NotificationRecord) {
    if (!n.isRead) {
      await markNotificationRead(n.id);
      await refreshNotifications();
    }
    setNotifOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await refreshNotifications();
  }

  const initials = (user?.fullName || "TB")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-[#F5F8FB] text-[#172B3A]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#102A3A] px-4 py-6 text-white lg:flex">
        <div className="px-2 pb-8">
          <Logo light to="/dashboard" />
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[#167C91] text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="mt-4 flex items-center gap-3 rounded-lg border border-white/15 px-3 py-2.5 text-sm font-medium text-[#E6F4F5] hover:bg-white/10 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-3 px-3 text-xs text-slate-300">
            <div className="truncate font-semibold text-white">{user?.fullName}</div>
            <div className="truncate text-slate-400">
              {user?.role === "buyer" ? "Buyer Account" : user?.role === "seller" ? "Seller Account" : "Administrator"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/15 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col bg-[#102A3A] px-4 py-6 text-white">
            <div className="flex items-center justify-between px-2 pb-6">
              <Logo light to="/dashboard" />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#167C91] text-white"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/15"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-[#172B3A] hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#64748B]">TrustBridge</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-semibold text-[#172B3A]">
                {getBreadcrumbTitle(location.pathname)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                aria-label="Toggle notifications"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#172B3A] transition-colors hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#167C91] px-1 text-[11px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:w-96">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-[#172B3A]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#167C91] hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 space-y-1.5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#64748B]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleMarkRead(n)}
                          className={`block w-full rounded-lg p-2.5 text-left transition-colors ${
                            n.isRead
                              ? "bg-white hover:bg-slate-50"
                              : "bg-[#E6F4F5]/60 hover:bg-[#E6F4F5]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#172B3A]">
                              {n.title}
                            </span>
                            <span className="text-[11px] text-[#64748B] tabular-nums">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/dashboard/settings"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-[#172B3A] hover:bg-slate-50"
              title="Account Settings"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#167C91] text-xs font-bold text-white">
                {initials || <UserRound className="h-4 w-4" />}
              </span>
              <span className="hidden max-w-[140px] truncate sm:inline">
                {user?.fullName}
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
