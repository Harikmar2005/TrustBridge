import { useEffect, useState } from "react";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import {
  getMySecurityOverview,
  markSecurityAlertRead,
  type SecurityAlertRecord,
  type SecurityEventRecord,
} from "../services/api";

export default function SecurityPage() {
  const [summary, setSummary] = useState({
    totalEvents: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    unreadAlerts: 0,
  });
  const [alerts, setAlerts] = useState<SecurityAlertRecord[]>([]);
  const [events, setEvents] = useState<SecurityEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getMySecurityOverview();
        if (active && res.data) {
          setSummary(res.data.summary);
          setAlerts(res.data.alerts || []);
          setEvents(res.data.events || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load security overview."
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

  async function handleMarkAlertRead(alertId: string) {
    try {
      await markSecurityAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
      );
      setSummary((prev) => ({
        ...prev,
        unreadAlerts: Math.max(0, prev.unreadAlerts - 1),
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update alert status."
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
          Security Alerts & Activity Log
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Rule-based advisories and authentication security events associated with your account.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#D84B4B]"
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">Total Events</p>
          <p className="mt-2 text-2xl font-bold text-[#102A3A] tabular-nums">
            {summary.totalEvents}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">Critical Severity</p>
          <p className="mt-2 text-2xl font-bold text-[#D84B4B] tabular-nums">
            {summary.criticalCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">High Severity</p>
          <p className="mt-2 text-2xl font-bold text-[#D99A28] tabular-nums">
            {summary.highCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-[#64748B]">Unread Alerts</p>
          <p className="mt-2 text-2xl font-bold text-[#167C91] tabular-nums">
            {summary.unreadAlerts}
          </p>
        </div>
      </section>

      {/* Alerts List */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-[#102A3A]">
          Interaction Safety Alerts
        </h2>
        {alerts.length === 0 ? (
          <div className="py-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-[#16845B]/50" />
            <p className="mt-2 text-sm font-medium text-[#102A3A]">
              No safety alerts recorded
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Suspicious message advisories and account notices appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 ${
                        alert.severity === "CRITICAL" || alert.severity === "HIGH"
                          ? "text-[#D84B4B]"
                          : "text-[#D99A28]"
                      }`}
                    />
                    <span className="text-sm font-semibold text-[#102A3A]">
                      {alert.title}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B]">
                      · {alert.severity}
                    </span>
                    {!alert.isRead && (
                      <span className="text-xs font-semibold text-[#167C91]">
                        · Unread
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {alert.message}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748B] tabular-nums">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                {!alert.isRead && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAlertRead(alert.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark as read</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Event History Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-[#102A3A]">
          Recorded Security Events
        </h2>
        {events.length === 0 ? (
          <p className="mt-4 text-xs text-[#64748B]">
            No security events logged on your account.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[#64748B]">
                  <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 pr-4 font-semibold">Event Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Severity</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-3 pr-4 text-[#64748B] tabular-nums">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11px] font-semibold text-[#102A3A]">
                      {ev.eventType}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[#172B3A]">
                      {ev.severity}
                    </td>
                    <td className="py-3 pr-4 text-[#64748B]">
                      {ev.status.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 text-[#64748B]">{ev.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
