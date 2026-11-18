import { useEffect, useState } from "react";
import { CheckCircle2, Search, ShieldBan, ShieldCheck } from "lucide-react";
import {
  adminListUsers,
  adminUpdateUserStatus,
  adminVerifySeller,
} from "../../services/api";

interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  status: "active" | "suspended" | "pending_deletion";
  trustScore: number | null;
  trustLevel: string | null;
  businessName: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await adminListUsers({ q, role, status });
      setUsers((res.users as AdminUserRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await adminListUsers({ q, role, status });
        if (active) {
          setUsers((res.users as AdminUserRow[]) || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load users."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [role, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleStatus(userRow: AdminUserRow) {
    setFeedback("");
    setError("");
    const nextStatus = userRow.status === "suspended" ? "active" : "suspended";
    try {
      const res = await adminUpdateUserStatus(userRow.id, nextStatus);
      setFeedback(String(res.message || "User status updated."));
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update user status."
      );
    }
  }

  async function handleVerifySeller(
    userId: string,
    verificationStatus: "verified" | "pending" | "unverified"
  ) {
    setFeedback("");
    setError("");
    try {
      const res = await adminVerifySeller(userId, verificationStatus);
      setFeedback(String(res.message || "Seller verification updated."));
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to verify seller."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
            User & Seller Management
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Filter accounts by role or status, verify seller storefronts, and manage account suspensions.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadUsers();
          }}
          className="flex w-full max-w-md gap-2"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or business..."
              aria-label="Search users"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#167C91]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#102A3A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="admin-role-filter" className="sr-only">
            Filter by role
          </label>
          <select
            id="admin-role-filter"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B3A]"
          >
            <option value="all">All Roles</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div>
          <label htmlFor="admin-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="admin-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B3A]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_deletion">Pending Deletion</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-[#D84B4B]"
        >
          {error}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-[#16845B]"
        >
          {feedback}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No accounts match the selected filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B]">
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Trust</th>
                <th className="px-4 py-3 font-semibold">Seller Verification</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-[#102A3A]">{u.fullName}</p>
                    <p className="text-[#64748B]">{u.email}</p>
                    {u.businessName && (
                      <p className="text-[11px] text-[#167C91]">
                        {u.businessName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 capitalize text-[#172B3A]">
                    {u.role}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`font-semibold ${
                        u.status === "active"
                          ? "text-[#16845B]"
                          : u.status === "suspended"
                          ? "text-[#D84B4B]"
                          : "text-[#D99A28]"
                      }`}
                    >
                      {u.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[#172B3A]">
                    {u.trustScore === null
                      ? u.trustLevel || "Not enough data"
                      : `${u.trustScore}/100`}
                  </td>
                  <td className="px-4 py-3.5">
                    {u.role === "seller" ? (
                      <span className="capitalize text-[#172B3A]">
                        {u.verificationStatus || "unverified"}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {u.role === "seller" &&
                        u.verificationStatus !== "verified" && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleVerifySeller(u.id, "verified")
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16845B] hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Verify Seller</span>
                          </button>
                        )}
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                            u.status === "suspended"
                              ? "border-emerald-300 text-[#16845B] hover:bg-emerald-50"
                              : "border-rose-300 text-[#D84B4B] hover:bg-rose-50"
                          }`}
                        >
                          {u.status === "suspended" ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              <span>Reactivate</span>
                            </>
                          ) : (
                            <>
                              <ShieldBan className="h-3 w-3" />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
