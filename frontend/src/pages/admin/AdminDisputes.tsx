import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import {
  adminListDisputes,
  adminUpdateDispute,
  getDisputeDetails,
  type DisputeRecord,
  type DisputeResponseRecord,
  type DisputeStatus,
} from "../../services/api";

const STATUS_OPTIONS: DisputeStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "WAITING_FOR_RESPONSE",
  "RESOLVED",
  "REJECTED",
];

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [responses, setResponses] = useState<DisputeResponseRecord[]>([]);
  const [statusDraft, setStatusDraft] = useState<DisputeStatus>("UNDER_REVIEW");
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadDisputes(selectId?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await adminListDisputes();
      const list = (res.disputes as DisputeRecord[]) || [];
      setDisputes(list);
      const nextId = selectId || selectedId || list[0]?.id || "";
      if (nextId) {
        setSelectedId(nextId);
        const found = list.find((d) => d.id === nextId);
        if (found) {
          setStatusDraft(found.status);
          setNotesDraft(found.resolutionNotes || "");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load disputes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await adminListDisputes();
        if (!active) return;
        const list = (res.disputes as DisputeRecord[]) || [];
        setDisputes(list);
        if (list[0]) {
          setSelectedId(list[0].id);
          setStatusDraft(list[0].status);
          setNotesDraft(list[0].resolutionNotes || "");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load disputes."
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

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void (async () => {
      try {
        const res = await getDisputeDetails(selectedId);
        if (active) {
          setResponses(res.data?.responses || []);
        }
      } catch {
        if (active) setResponses([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const activeDispute = disputes.find((d) => d.id === selectedId) || null;

  async function handleSaveDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDispute) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const res = await adminUpdateDispute(
        activeDispute.id,
        statusDraft,
        notesDraft
      );
      setFeedback(String(res.message || "Dispute decision saved."));
      await loadDisputes(activeDispute.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update dispute."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
          Dispute Arbitration Queue
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Review buyer and seller evidence, inspect conversation threads, and issue binding case decisions.
        </p>
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

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#102A3A]">
              All Cases ({disputes.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-6 text-xs text-[#64748B]">Loading disputes...</div>
          ) : disputes.length === 0 ? (
            <div className="p-8 text-center">
              <Scale className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs text-[#64748B]">
                No disputes filed on the platform yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {disputes.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(d.id);
                      setStatusDraft(d.status);
                      setNotesDraft(d.resolutionNotes || "");
                    }}
                    className={`block w-full px-5 py-4 text-left transition-colors ${
                      selectedId === d.id
                        ? "bg-[#E6F4F5]/70"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[#102A3A]">
                        {d.subject}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#167C91]">
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {d.buyerName} vs {d.sellerName} · {d.category}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          {!activeDispute ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              Select a dispute case to review details and record an arbitration decision.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#102A3A]">
                  {activeDispute.subject}
                </h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  {activeDispute.category} · Buyer: {activeDispute.buyerName} · Seller:{" "}
                  {activeDispute.sellerName}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#172B3A]">
                  {activeDispute.description}
                </p>

                {activeDispute.evidence.length > 0 && (
                  <div className="mt-4 rounded-lg bg-[#F5F8FB] p-3 text-xs">
                    <p className="font-semibold text-[#102A3A]">Evidence:</p>
                    <ul className="mt-1 list-disc pl-5 text-[#64748B]">
                      {activeDispute.evidence.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {responses.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Participant Responses
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {responses.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-slate-200 bg-[#F5F8FB] p-3 text-xs"
                      >
                        <p className="font-semibold text-[#102A3A]">
                          {r.authorName} ({r.authorRole}) ·{" "}
                          <span className="font-normal text-[#64748B] tabular-nums">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p className="mt-1 text-[#172B3A]">{r.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form
                onSubmit={handleSaveDecision}
                className="space-y-4 border-t border-slate-100 pt-4"
              >
                <div>
                  <label
                    htmlFor="admin-dispute-status"
                    className="block text-xs font-semibold text-[#172B3A]"
                  >
                    Case Status
                  </label>
                  <select
                    id="admin-dispute-status"
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as DisputeStatus)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-dispute-notes"
                    className="block text-xs font-semibold text-[#172B3A]"
                  >
                    Resolution Notes
                  </label>
                  <textarea
                    id="admin-dispute-notes"
                    rows={3}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Document your arbitration decision and next steps for both parties..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Update Dispute Decision"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
