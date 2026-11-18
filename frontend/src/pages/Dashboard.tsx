import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Scale,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  createConversation,
  getDashboardSummary,
  type NotificationRecord,
  type SecurityAlertRecord,
  type SellerProfile,
  type TrustScoreResult,
} from "../services/api";

interface DashboardData {
  metrics: {
    totalConversations: number;
    activeConversations: number;
    unreadMessages: number;
    securityAlerts: number;
    openDisputes: number;
  };
  trustScore: TrustScoreResult;
  sellerProfile: SellerProfile | null;
  recentConversations: Array<{
    id: string;
    participantId: string;
    participantName: string;
    participantRole: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
  }>;
  recentAlerts: SecurityAlertRecord[];
  recentNotifications: NotificationRecord[];
  recentSellers: SellerProfile[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await getDashboardSummary();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard summary."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getDashboardSummary();
        if (active && res.data) {
          setData(res.data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard summary."
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

  async function handleQuickMessage(sellerUserId: string) {
    setActionError("");
    try {
      const res = await createConversation(sellerUserId);
      if (res.conversationId) {
        navigate(`/dashboard/messages/${res.conversationId}`);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to open conversation."
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#D84B4B]"
      >
        <p className="font-semibold">Unable to load your workspace overview</p>
        <p className="mt-1">{error || "Unexpected response from server."}</p>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-4 rounded-lg bg-[#102A3A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const ts = data.trustScore;
  const isSeller = user?.role === "seller";

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#167C91]">
            {isSeller ? "Seller Workspace" : "Buyer Workspace"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#102A3A]">
            Welcome back, {user?.fullName}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {isSeller
              ? "Monitor buyer inquiries, business verification status, security advisories, and dispute resolution."
              : "Browse verified sellers, communicate securely, track trust signals, and manage transaction disputes."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isSeller && (
            <Link
              to="/sellers"
              className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] whitespace-nowrap"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Browse Sellers</span>
            </Link>
          )}
          {isSeller && (
            <Link
              to="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] whitespace-nowrap"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Manage Storefront</span>
            </Link>
          )}
          <Link
            to="/dashboard/messages"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#172B3A] transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>Open Messages</span>
          </Link>
        </div>
      </section>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#D84B4B]"
        >
          {actionError}
        </div>
      )}

      {/* KPI Metrics Row */}
      <section aria-label="Workspace metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Conversations</span>
            <MessageSquare className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {data.metrics.totalConversations}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {data.metrics.unreadMessages} unread messages
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Explainable Trust Score</span>
            <ShieldCheck className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#102A3A] tabular-nums">
            {ts.insufficientData || ts.score === null
              ? "Not enough data"
              : `${ts.score} / 100`}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {ts.insufficientData ? "Requires more account activity" : `Standing: ${ts.level}`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Unread Security Alerts</span>
            <AlertTriangle className="h-4 w-4 text-[#D99A28]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {data.metrics.securityAlerts}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Rule-based interaction advisories
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Open Disputes</span>
            <Scale className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#102A3A] tabular-nums">
            {data.metrics.openDisputes}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Active resolution cases
          </p>
        </div>
      </section>

      {/* Seller Profile Card (for sellers) */}
      {isSeller && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-[#102A3A]">
                Seller Business Profile
              </h2>
              {data.sellerProfile ? (
                <p className="mt-1 text-sm text-[#64748B]">
                  {data.sellerProfile.businessName} · {data.sellerProfile.category} ·{" "}
                  {data.sellerProfile.location} ·{" "}
                  <span className="font-semibold text-[#102A3A]">
                    Verification: {data.sellerProfile.verificationStatus}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#64748B]">
                  Complete your storefront details so buyers can evaluate your business profile.
                </p>
              )}
            </div>
            <Link
              to="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#167C91] hover:underline"
            >
              <span>Edit Business Profile</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-[#102A3A]">
              Recent Conversations
            </h2>
            <Link
              to="/dashboard/messages"
              className="text-xs font-semibold text-[#167C91] hover:underline"
            >
              View all
            </Link>
          </div>

          {data.recentConversations.length === 0 ? (
            <div className="py-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-[#102A3A]">
                No conversations yet
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                {isSeller
                  ? "Buyer inquiries will appear here as soon as a thread starts."
                  : "Browse the Seller Directory to open your first conversation."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentConversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    to={`/dashboard/messages/${conv.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#102A3A]">
                        {conv.participantName}{" "}
                        <span className="font-normal text-xs text-[#64748B]">
                          · {conv.participantRole}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {conv.lastMessage || "Conversation opened — no messages yet"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#64748B] tabular-nums">
                      {conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleDateString()
                        : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Security Alerts */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-[#102A3A]">
              Recent Security Advisories
            </h2>
            <Link
              to="/dashboard/security"
              className="text-xs font-semibold text-[#167C91] hover:underline"
            >
              View security center
            </Link>
          </div>

          {data.recentAlerts.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#16845B]/50" />
              <p className="mt-2 text-sm font-medium text-[#102A3A]">
                No security alerts recorded
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Automated checks will notify you here if suspicious patterns appear.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentAlerts.map((alert) => (
                <li key={alert.id} className="py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#102A3A]">
                      {alert.title}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        alert.severity === "CRITICAL" || alert.severity === "HIGH"
                          ? "text-[#D84B4B]"
                          : "text-[#D99A28]"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {alert.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Buyer Recommended Sellers */}
      {!isSeller && data.recentSellers.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#102A3A]">
                Marketplace Sellers
              </h2>
              <p className="text-xs text-[#64748B]">
                Verified profiles and transparent trust evaluations
              </p>
            </div>
            <Link
              to="/sellers"
              className="text-xs font-semibold text-[#167C91] hover:underline"
            >
              Browse directory
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.recentSellers.map((seller) => (
              <div
                key={seller.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#102A3A]">
                    {seller.businessName}
                  </p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {seller.category} · {seller.location} ·{" "}
                    {seller.trustScore?.insufficientData ||
                    seller.trustScore?.score === null
                      ? "Not enough data"
                      : `Trust ${seller.trustScore?.score}/100`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleQuickMessage(seller.userId)}
                  className="shrink-0 rounded-lg bg-[#167C91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E6F]"
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
