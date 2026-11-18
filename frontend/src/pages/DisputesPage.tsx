import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Loader2, Plus, Scale, Send } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  addDisputeResponse,
  createDispute,
  getConversations,
  getDisputeDetails,
  listDisputes,
  listSellers,
  type ConversationSummary,
  type DisputeRecord,
  type DisputeResponseRecord,
  type SellerProfile,
} from "../services/api";

const STATUS_TABS = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "WAITING_FOR_RESPONSE",
  "RESOLVED",
  "REJECTED",
] as const;

export default function DisputesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>("");
  const [activeDispute, setActiveDispute] = useState<DisputeRecord | null>(null);
  const [responses, setResponses] = useState<DisputeResponseRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  // Create dispute modal/panel
  const [createOpen, setCreateOpen] = useState(
    Boolean(searchParams.get("counterpartyId"))
  );
  const [counterparties, setCounterparties] = useState<
    Array<{ id: string; label: string; conversationId?: string }>
  >([]);
  const [counterpartyId, setCounterpartyId] = useState(
    searchParams.get("counterpartyId") || ""
  );
  const [conversationId, setConversationId] = useState(
    searchParams.get("conversationId") || ""
  );
  const [category, setCategory] = useState("Order or delivery issue");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replyEvidence, setReplyEvidence] = useState("");
  const [replySending, setReplySending] = useState(false);

  async function loadDisputes(selectId?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await listDisputes();
      const list = (res.disputes as DisputeRecord[]) || [];
      setDisputes(list);
      const nextId = selectId || selectedDisputeId || list[0]?.id || "";
      if (nextId) {
        setSelectedDisputeId(nextId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await listDisputes();
        if (!active) return;
        const list = (res.disputes as DisputeRecord[]) || [];
        setDisputes(list);
        if (list[0]?.id) {
          setSelectedDisputeId((prev) => prev || list[0].id);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load disputes."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    void (async () => {
      try {
        const options = new Map<
          string,
          { id: string; label: string; conversationId?: string }
        >();
        const convRes = await getConversations();
        const convs = (convRes.conversations as ConversationSummary[]) || [];
        for (const c of convs) {
          options.set(c.participantId, {
            id: c.participantId,
            label: `${c.participantBusinessName || c.participantName} (${c.participantRole})`,
            conversationId: c.id,
          });
        }
        if (user?.role === "buyer") {
          const sellersRes = await listSellers();
          const sellers = (sellersRes.sellers as SellerProfile[]) || [];
          for (const s of sellers) {
            if (!options.has(s.userId)) {
              options.set(s.userId, {
                id: s.userId,
                label: `${s.businessName} (${s.fullName || "Seller"})`,
              });
            }
          }
        }
        if (!active) return;
        const list = Array.from(options.values());
        setCounterparties(list);
        if (list.length > 0) {
          setCounterpartyId((prev) => prev || list[0].id);
          setConversationId((prev) => prev || list[0].conversationId || "");
        }
      } catch {
        // Non-blocking
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.role]);

  async function loadDisputeDetail(disputeId: string) {
    if (!disputeId) {
      setActiveDispute(null);
      setResponses([]);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await getDisputeDetails(disputeId);
      if (res.data) {
        setActiveDispute(res.data.dispute);
        setResponses(res.data.responses || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dispute details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedDisputeId) return;
    let active = true;
    void (async () => {
      try {
        const res = await getDisputeDetails(selectedDisputeId);
        if (active && res.data) {
          setActiveDispute(res.data.dispute);
          setResponses(res.data.responses || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dispute details."
          );
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedDisputeId]);

  const filteredDisputes = useMemo(() => {
    if (filterStatus === "ALL") return disputes;
    return disputes.filter((d) => d.status === filterStatus);
  }, [disputes, filterStatus]);

  async function handleCreateDispute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const evidence = evidenceText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const res = await createDispute({
        counterpartyId,
        conversationId: conversationId || null,
        category,
        subject,
        description,
        evidence,
      });

      setSubject("");
      setDescription("");
      setEvidenceText("");
      setCreateOpen(false);
      await loadDisputes(String(res.disputeId || ""));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit dispute."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDispute || !replyText.trim()) return;
    setReplySending(true);
    setError("");
    try {
      await addDisputeResponse(activeDispute.id, {
        message: replyText.trim(),
        evidenceText: replyEvidence.trim() || undefined,
      });
      setReplyText("");
      setReplyEvidence("");
      await loadDisputeDetail(activeDispute.id);
      await loadDisputes(activeDispute.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send response.");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
            Transaction Disputes
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            File documented transaction claims, attach evidence summaries, and track administrator arbitration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#105E6F]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{createOpen ? "Close Form" : "Open Dispute"}</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#D84B4B]"
        >
          {error}
        </div>
      )}

      {/* Create Dispute Form */}
      {createOpen && (
        <form
          onSubmit={handleCreateDispute}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-base font-semibold text-[#102A3A]">
            Submit a New Transaction Dispute
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dispute-counterparty"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Counterparty
              </label>
              <select
                id="dispute-counterparty"
                value={counterpartyId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCounterpartyId(id);
                  const found = counterparties.find((c) => c.id === id);
                  setConversationId(found?.conversationId || "");
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              >
                {counterparties.length === 0 ? (
                  <option value="">No eligible counterparties yet</option>
                ) : (
                  counterparties.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="dispute-category"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Category
              </label>
              <select
                id="dispute-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              >
                <option>Order or delivery issue</option>
                <option>Item not as described</option>
                <option>Payment or refund discrepancy</option>
                <option>Off-platform solicitation</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="dispute-subject"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Subject
              </label>
              <input
                id="dispute-subject"
                type="text"
                required
                minLength={4}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the dispute (min 4 characters)"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div>
              <label
                htmlFor="dispute-description"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Description
              </label>
              <textarea
                id="dispute-description"
                rows={3}
                required
                minLength={15}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, dates, and expected resolution (min 15 characters)..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div>
              <label
                htmlFor="dispute-evidence"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Evidence notes or reference IDs (one per line, optional)
              </label>
              <textarea
                id="dispute-evidence"
                rows={2}
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="Order #TB-4012&#10;Invoice PDF reference"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#172B3A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !counterpartyId}
                className="rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F] disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === status
                ? "bg-[#167C91] text-white"
                : "border border-slate-200 bg-white text-[#64748B] hover:text-[#172B3A]"
            }`}
          >
            {status.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Split View */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Dispute List */}
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#102A3A]">
              Cases ({filteredDisputes.length})
            </h2>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="p-8 text-center">
              <Scale className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-medium text-[#102A3A]">
                No disputes match this filter
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredDisputes.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDisputeId(d.id)}
                    className={`block w-full px-5 py-4 text-left transition-colors ${
                      selectedDisputeId === d.id
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
                      {d.category} · {d.buyerName} vs {d.sellerName}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dispute Detail */}
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          {detailLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#167C91]" />
            </div>
          ) : !activeDispute ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              Select a dispute case to inspect evidence, timeline, and responses.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-[#102A3A]">
                    {activeDispute.subject}
                  </h2>
                  <span className="text-xs font-semibold text-[#167C91]">
                    Status: {activeDispute.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">
                  {activeDispute.category} · Buyer: {activeDispute.buyerName} · Seller:{" "}
                  {activeDispute.sellerName}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#172B3A]">
                  {activeDispute.description}
                </p>

                {activeDispute.evidence.length > 0 && (
                  <div className="mt-4 rounded-lg bg-[#F5F8FB] p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#102A3A]">
                      <FileText className="h-3.5 w-3.5 text-[#167C91]" />
                      <span>Submitted Evidence</span>
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-[#64748B]">
                      {activeDispute.evidence.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeDispute.resolutionNotes && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <span className="font-semibold">Administrator decision notes: </span>
                    {activeDispute.resolutionNotes}
                  </div>
                )}
              </div>

              {/* Response Timeline */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Case Timeline ({responses.length})
                </h3>
                {responses.length === 0 ? (
                  <p className="mt-3 text-xs text-[#64748B]">
                    No follow-up responses recorded yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {responses.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-slate-200 bg-[#F5F8FB] p-3.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#102A3A]">
                            {r.authorName} ({r.authorRole})
                          </span>
                          <span className="text-[#64748B] tabular-nums">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-[#172B3A]">
                          {r.message}
                        </p>
                        {r.evidenceText && (
                          <p className="mt-1.5 text-xs text-[#167C91]">
                            Evidence note: {r.evidenceText}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add Response */}
              {activeDispute.status !== "RESOLVED" &&
                activeDispute.status !== "REJECTED" && (
                  <form
                    onSubmit={handleSendReply}
                    className="space-y-3 border-t border-slate-100 pt-4"
                  >
                    <label
                      htmlFor="dispute-reply"
                      className="block text-xs font-semibold text-[#172B3A]"
                    >
                      Add response or additional evidence
                    </label>
                    <textarea
                      id="dispute-reply"
                      rows={2}
                      required
                      minLength={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a case update..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                    />
                    <input
                      type="text"
                      value={replyEvidence}
                      onChange={(e) => setReplyEvidence(e.target.value)}
                      placeholder="Optional evidence reference (tracking ID, receipt ref)"
                      aria-label="Optional evidence reference"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#167C91]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replySending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{replySending ? "Posting..." : "Post Response"}</span>
                      </button>
                    </div>
                  </form>
                )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
