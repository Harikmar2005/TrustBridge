import { useState } from "react";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/common/Logo";

const ADMIN_NAV = [
  { to: "/admin", label: "Platform Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "User Management", icon: Users, end: false },
  { to: "/admin/security", label: "Security & Audit", icon: ShieldAlert, end: false },
  { to: "/admin/disputes", label: "Dispute Arbitration", icon: Scale, end: false },
];

function getAdminBreadcrumb(pathname: string): string {
  if (pathname.startsWith("/admin/users")) return "User Management";
  if (pathname.startsWith("/admin/security")) return "Security & Audit";
  if (pathname.startsWith("/admin/disputes")) return "Dispute Arbitration";
  return "Platform Overview";
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F8FB] text-[#172B3A]">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#102A3A] px-4 py-6 text-white lg:flex">
        <div className="px-2 pb-2">
          <Logo light to="/admin" />
        </div>
        <p className="px-2 pb-6 text-xs text-slate-400">
          Administrator Console
        </p>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Admin Navigation">
          {ADMIN_NAV.map((item) => {
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
        </nav>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-3 px-3 text-xs">
            <div className="truncate font-semibold text-white">{user?.fullName}</div>
            <div className="truncate text-slate-400">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-200 hover:bg-rose-500/15"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col bg-[#102A3A] px-4 py-6 text-white">
            <div className="flex items-center justify-between px-2 pb-6">
              <Logo light to="/admin" />
              <button
                type="button"
                aria-label="Close admin menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? "bg-[#167C91] text-white"
                          : "text-slate-300 hover:bg-white/10"
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
              className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/15"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open admin menu"
              onClick={() => setMobileOpen(true)}
              className="shrink-0 rounded-lg border border-slate-200 p-2 text-[#172B3A] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="shrink-0 text-[#64748B]">Admin</span>
              <span className="shrink-0 text-slate-300" aria-hidden="true">/</span>
              <span className="truncate font-semibold text-[#172B3A]">
                {getAdminBreadcrumb(location.pathname)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Activity className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
            <span className="hidden sm:inline">Role: Administrator</span>
            <span className="sm:hidden">Admin</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
