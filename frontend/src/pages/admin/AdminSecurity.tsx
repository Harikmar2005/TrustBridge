import { useEffect, useState } from "react";
import {
  adminGetSecurityData,
  adminUpdatePolicy,
  adminUpdateReport,
  adminUpdateSecurityEvent,
  type SecurityEventRecord,
  type SecurityEventStatus,
} from "../../services/api";

interface ReportRow {
  id: string;
  reporterName: string;
  reportedUserName: string;
  reportedUserEmail: string;
  reason: string;
  details: string;
  status: "PENDING_REVIEW" | "REVIEWED" | "DISMISSED";
  createdAt: string;
}

interface ConvModRow {
  id: string;
  buyerName: string;
  sellerName: string;
  status: string;
  reportedFlag: number;
  messageCount: number;
  updatedAt: string;
}

interface AuditRow {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

interface PolicyRow {
  key: string;
  label: string;
  value: string;
  description: string;
}

type SecurityTab = "events" | "reports" | "conversations" | "audit" | "policies";

export default function AdminSecurity() {
  const [tab, setTab] = useState<SecurityTab>("events");
  const [events, setEvents] = useState<SecurityEventRecord[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [conversations, setConversations] = useState<ConvModRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await adminGetSecurityData();
      const d = res.data;
      if (d) {
        setEvents(d.events || []);
        setReports(d.reports || []);
        setConversations(d.conversations || []);
        setAuditLogs(d.auditLogs || []);
        const pols = d.policies || [];
        setPolicies(pols);
        const nextDrafts: Record<string, string> = {};
        for (const p of pols) {
          nextDrafts[p.key] = p.value;
        }
        setPolicyDrafts(nextDrafts);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load security queue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await adminGetSecurityData();
        const d = res.data;
        if (active && d) {
          setEvents(d.events || []);
          setReports(d.reports || []);
          setConversations(d.conversations || []);
          setAuditLogs(d.auditLogs || []);
          const pols = d.policies || [];
          setPolicies(pols);
          const nextDrafts: Record<string, string> = {};
          for (const p of pols) {
            nextDrafts[p.key] = p.value;
          }
          setPolicyDrafts(nextDrafts);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load security queue."
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

  async function handleUpdateEvent(
    eventId: string,
    status: SecurityEventStatus
  ) {
    setFeedback("");
    try {
      await adminUpdateSecurityEvent(
        eventId,
        status,
        noteDrafts[eventId] || undefined
      );
      setFeedback("Security event updated.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update security event."
      );
    }
  }

  async function handleUpdateReport(
    reportId: string,
    status: "REVIEWED" | "DISMISSED" | "PENDING_REVIEW"
  ) {
    setFeedback("");
    try {
      await adminUpdateReport(reportId, status);
      setFeedback("Report status updated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update report.");
    }
  }

  async function handleSavePolicy(key: string) {
    setFeedback("");
    try {
      await adminUpdatePolicy(key, policyDrafts[key] || "");
      setFeedback(`Updated policy: ${key}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
          Security Events, Reports & Platform Policies
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Review automated rule triggers, inspect user-submitted reports, monitor flagged threads, and manage thresholds.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["events", `Security Events (${events.length})`],
            ["reports", `Account Reports (${reports.length})`],
            ["conversations", `Conversations (${conversations.length})`],
            ["audit", `Audit Logs (${auditLogs.length})`],
            ["policies", `Policies (${policies.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === key
                ? "bg-[#167C91] text-white"
                : "border border-slate-200 bg-white text-[#64748B] hover:text-[#172B3A]"
            }`}
          >
            {label}
          </button>
        ))}
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

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-[#64748B]">
          Loading security telemetry...
        </div>
      ) : tab === "events" ? (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-[#64748B]">
              No security events recorded.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#102A3A]">
                      {ev.eventType}
                    </span>
                    <span className="text-[#64748B]">·</span>
                    <span
                      className={`font-semibold ${
                        ev.severity === "CRITICAL" || ev.severity === "HIGH"
                          ? "text-[#D84B4B]"
                          : "text-[#D99A28]"
                      }`}
                    >
                      {ev.severity}
                    </span>
                    <span className="text-[#64748B]">·</span>
                    <span className="text-[#167C91]">
                      {ev.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] tabular-nums">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#172B3A]">{ev.description}</p>
                {ev.userEmail && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    Account: {ev.userName} ({ev.userEmail})
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Admin review notes..."
                    aria-label={`Review notes for ${ev.id}`}
                    value={noteDrafts[ev.id] ?? ev.reviewNotes ?? ""}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({
                        ...prev,
                        [ev.id]: e.target.value,
                      }))
                    }
                    className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-[#167C91]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdateEvent(ev.id, "UNDER_INVESTIGATION")
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
                  >
                    Investigate
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateEvent(ev.id, "RESOLVED")}
                    className="rounded-lg bg-[#167C91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E6F]"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateEvent(ev.id, "DISMISSED")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "reports" ? (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-[#64748B]">
              No account reports submitted.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#102A3A]">
                    {rep.reason} ·{" "}
                    <span className="text-[#167C91]">
                      {rep.status.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="text-[#64748B] tabular-nums">
                    {new Date(rep.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">
                  Reported: {rep.reportedUserName} ({rep.reportedUserEmail}) · By:{" "}
                  {rep.reporterName}
                </p>
                <p className="mt-2 text-sm text-[#172B3A]">{rep.details}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateReport(rep.id, "REVIEWED")}
                    className="rounded-lg bg-[#167C91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E6F]"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateReport(rep.id, "DISMISSED")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "conversations" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B]">
                <th className="px-4 py-3 font-semibold">Participants</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reported</th>
                <th className="px-4 py-3 font-semibold">Messages</th>
                <th className="px-4 py-3 font-semibold">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversations.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-[#102A3A]">
                    {c.buyerName} ↔ {c.sellerName}
                  </td>
                  <td className="px-4 py-3 capitalize text-[#172B3A]">
                    {c.status}
                  </td>
                  <td className="px-4 py-3">
                    {c.reportedFlag ? (
                      <span className="font-semibold text-[#D84B4B]">Yes</span>
                    ) : (
                      <span className="text-[#64748B]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.messageCount}</td>
                  <td className="px-4 py-3 text-[#64748B] tabular-nums">
                    {new Date(c.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === "audit" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B]">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-[#64748B] tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#172B3A]">
                    {log.actorName || log.actorEmail || "System"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#102A3A]">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {log.targetType} {log.targetId ? `(${log.targetId.slice(0, 8)})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((pol) => (
            <div
              key={pol.key}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
            >
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-[#102A3A]">
                  {pol.label}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">{pol.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Value for ${pol.label}`}
                  value={policyDrafts[pol.key] ?? pol.value}
                  onChange={(e) =>
                    setPolicyDrafts((prev) => ({
                      ...prev,
                      [pol.key]: e.target.value,
                    }))
                  }
                  className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-[#167C91]"
                />
                <button
                  type="button"
                  onClick={() => void handleSavePolicy(pol.key)}
                  className="rounded-lg bg-[#167C91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E6F]"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
