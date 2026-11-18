import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Flag,
  MessageSquare,
  Scale,
  ShieldAlert,
  Users,
} from "lucide-react";
import { getAdminOverview } from "../../services/api";

interface AdminStats {
  totalUsers: number;
  buyersCount: number;
  sellersCount: number;
  suspendedCount: number;
  totalConversations: number;
  flaggedConversations: number;
  pendingSecurityEvents: number;
  criticalEvents: number;
  openDisputes: number;
  pendingReports: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getAdminOverview();
        if (active && res.data?.stats) {
          setStats(res.data.stats);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load platform metrics."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#D84B4B]"
      >
        {error || "Unable to load administrator overview."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#167C91]">
          Administrator Control Center
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#102A3A]">
          Platform Governance & Security Overview
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Live metrics across accounts, flagged conversations, security events, and dispute arbitration.
        </p>
      </div>

      {/* KPI Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Registered Accounts</span>
            <Users className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {stats.totalUsers}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {stats.buyersCount} buyers · {stats.sellersCount} sellers ·{" "}
            {stats.suspendedCount} suspended
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Conversations</span>
            <MessageSquare className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {stats.totalConversations}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {stats.flaggedConversations} flagged for review
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Pending Security Events</span>
            <ShieldAlert className="h-4 w-4 text-[#D84B4B]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {stats.pendingSecurityEvents}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {stats.criticalEvents} critical severity
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Disputes & Reports</span>
            <Scale className="h-4 w-4 text-[#D99A28]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {stats.openDisputes}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            Open disputes · {stats.pendingReports} pending reports
          </p>
        </div>
      </section>

      {/* Queue Shortcuts */}
      <section className="grid gap-6 md:grid-cols-3">
        <Link
          to="/admin/users"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-[#167C91]"
        >
          <Users className="h-6 w-6 text-[#167C91]" />
          <h2 className="mt-4 text-base font-semibold text-[#102A3A]">
            User & Seller Verification
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
            Review buyer and seller accounts, verify storefronts, or suspend accounts violating platform policies.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#167C91]">
            <span>Manage users</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          to="/admin/security"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-[#167C91]"
        >
          <AlertTriangle className="h-6 w-6 text-[#D99A28]" />
          <h2 className="mt-4 text-base font-semibold text-[#102A3A]">
            Security Events, Reports & Audit
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
            Investigate automated rule triggers, inspect reported conversations, view audit logs, and adjust policy thresholds.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#167C91]">
            <span>Inspect security queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          to="/admin/disputes"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-[#167C91]"
        >
          <Flag className="h-6 w-6 text-[#167C91]" />
          <h2 className="mt-4 text-base font-semibold text-[#102A3A]">
            Dispute Arbitration
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
            Examine buyer and seller evidence timelines, update case statuses, and publish official resolution notes.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#167C91]">
            <span>Review disputes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
