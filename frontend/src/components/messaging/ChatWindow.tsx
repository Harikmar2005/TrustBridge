import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Flag,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ChatMessage, ConversationSummary } from "../../types/message";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface ChatWindowProps {
  conversation: ConversationSummary | null;
  messages: ChatMessage[];
  currentUserId?: string;
  loading: boolean;
  error: string;
  safetyNotice: string;
  composerText: string;
  sending: boolean;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onDeleteMessage: (messageId: string) => void;
  onTranslateMessage: (message: ChatMessage) => void;
  onOpenReport: () => void;
  onBackToList: () => void;
  onOpenNewConversation: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ChatWindow({
  conversation,
  messages,
  currentUserId,
  loading,
  error,
  safetyNotice,
  composerText,
  sending,
  onComposerChange,
  onSend,
  onDeleteMessage,
  onTranslateMessage,
  onOpenReport,
  onBackToList,
  onOpenNewConversation,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  const hasRiskyMessages = messages.some(
    (m) =>
      m.riskLevel === "HIGH" ||
      m.riskLevel === "CRITICAL" ||
      m.riskLevel === "MEDIUM"
  );

  if (!conversation) {
    if (loading) {
      return (
        <section className="flex min-w-0 flex-1 flex-col items-center justify-center bg-[#F5F8FB] p-8 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#167C91]" />
          <p className="mt-3 text-xs text-[#64748B]">Loading conversation...</p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="flex min-w-0 flex-1 flex-col items-center justify-center bg-[#F5F8FB] p-8 text-center">
          <div
            role="alert"
            className="max-w-md rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs text-[#D84B4B]"
          >
            {error}
          </div>
          <button
            type="button"
            onClick={onBackToList}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to conversations</span>
          </button>
        </section>
      );
    }

    return (
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center bg-[#F5F8FB] p-8 text-center">
        <MessageSquare className="h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-[#102A3A]">
          Select a conversation
        </h2>
        <p className="mt-1 max-w-sm text-xs text-[#64748B]">
          Choose an existing thread on the left or start a new conversation.
        </p>
        <button
          type="button"
          onClick={onOpenNewConversation}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Conversation</span>
        </button>
      </section>
    );
  }

  const displayTitle =
    conversation.participantBusinessName || conversation.participantName;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#F5F8FB]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to conversations"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-[#172B3A] hover:bg-slate-50 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F4F5] text-xs font-bold text-[#102A3A]"
          >
            {getInitials(displayTitle)}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[#102A3A]">
              {displayTitle}
            </h2>
            <p className="truncate text-xs text-[#64748B]">
              {conversation.participantName} · {conversation.participantRole}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={`/dashboard/disputes?counterpartyId=${conversation.participantId}&conversationId=${conversation.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#172B3A] hover:bg-slate-50"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Dispute</span>
          </Link>
          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#D84B4B]"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Report</span>
          </button>
        </div>
      </header>

      {(hasRiskyMessages || safetyNotice) && (
        <div
          role="status"
          className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D99A28]" />
          <div>
            <span className="font-semibold">Automated safety advisory: </span>
            {safetyNotice ||
              "One or more messages in this thread matched rule-based risk patterns (such as off-platform payment or urgency requests). Keep payments and agreements documented on TrustBridge."}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-xs text-[#D84B4B]"
        >
          {error}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#167C91]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            No messages in this thread yet. Introduce your inquiry below.
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
              onDelete={onDeleteMessage}
              onTranslate={onTranslateMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        value={composerText}
        onChange={onComposerChange}
        onSubmit={onSend}
        sending={sending}
      />
    </section>
  );
}
