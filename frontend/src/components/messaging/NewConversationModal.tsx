import { useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import {
  createOrGetConversation,
  fetchAvailableSellers,
} from "../../services/messageService";
import type { SellerProfile, UserRole } from "../../types/message";

interface NewConversationModalProps {
  open: boolean;
  currentUserId?: string;
  currentUserRole?: UserRole;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export default function NewConversationModal({
  open,
  currentUserId,
  currentUserRole,
  onClose,
  onCreated,
}: NewConversationModalProps) {
  const [recipientId, setRecipientId] = useState("");
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || currentUserRole !== "buyer") return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        if (active) setLoadingSellers(true);
        const list = await fetchAvailableSellers();
        if (active) {
          setSellers(list.filter((s) => s.userId !== currentUserId));
        }
      } catch {
        // Recipient ID input remains available even if seller listing fails
      } finally {
        if (active) setLoadingSellers(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, currentUserRole, currentUserId]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = recipientId.trim();
    if (!trimmed) {
      setError("Please enter or select a recipient user ID.");
      return;
    }
    if (trimmed === currentUserId) {
      setError("You cannot start a conversation with yourself.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await createOrGetConversation(trimmed);
      setRecipientId("");
      onCreated(result.conversationId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start conversation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-conv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="new-conv-modal-title"
            className="flex items-center gap-2 text-base font-semibold text-[#102A3A]"
          >
            <MessageSquarePlus className="h-5 w-5 text-[#167C91]" />
            <span>Start New Conversation</span>
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => {
              setError("");
              onClose();
            }}
            className="rounded-lg p-1 text-[#64748B] hover:bg-slate-100 hover:text-[#172B3A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1.5 text-xs text-[#64748B]">
          Conversations are strictly between a buyer and a seller.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {currentUserRole === "buyer" && (
            <div>
              <label
                htmlFor="new-conv-seller-select"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Select a Seller (optional)
              </label>
              <select
                id="new-conv-seller-select"
                value={
                  sellers.some((s) => s.userId === recipientId)
                    ? recipientId
                    : ""
                }
                onChange={(e) => {
                  setRecipientId(e.target.value);
                  setError("");
                }}
                disabled={loadingSellers}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
              >
                <option value="">
                  {loadingSellers
                    ? "Loading sellers..."
                    : "Choose a seller from directory..."}
                </option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.userId}>
                    {seller.businessName} ({seller.fullName || seller.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="new-conv-recipient-id"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              Recipient User ID
            </label>
            <input
              id="new-conv-recipient-id"
              type="text"
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value);
                setError("");
              }}
              placeholder="Paste counterpart user UUID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
            />
            {currentUserRole === "seller" && (
              <p className="mt-1 text-[11px] text-[#64748B]">
                Buyer directories are private; enter a buyer&apos;s User ID or reply to incoming inquiries.
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-[#D84B4B]"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setError("");
                onClose();
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !recipientId.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{submitting ? "Opening..." : "Start Conversation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
