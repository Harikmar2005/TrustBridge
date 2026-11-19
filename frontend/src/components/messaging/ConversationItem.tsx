import type { ConversationSummary } from "../../types/message";

interface ConversationItemProps {
  conversation: ConversationSummary;
  isSelected: boolean;
  onSelect: (conversationId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatConversationTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationItemProps) {
  const displayTitle =
    conversation.participantBusinessName || conversation.participantName;
  const initials = getInitials(displayTitle);
  const timestamp = formatConversationTime(
    conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={isSelected ? "true" : undefined}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors ${
          isSelected
            ? "border-l-2 border-l-[#167C91] bg-[#E6F4F5]/75"
            : "border-l-2 border-l-transparent hover:bg-slate-50"
        }`}
      >
        <div
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isSelected
              ? "bg-[#167C91] text-white"
              : "bg-slate-200 text-[#102A3A]"
          }`}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-[#102A3A]">
              {displayTitle}
            </span>
            {timestamp && (
              <span className="shrink-0 text-[11px] text-[#64748B] tabular-nums">
                {timestamp}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-[#64748B]">
              {conversation.participantName} · {conversation.participantRole}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-[#167C91] px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                {conversation.unreadCount}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs text-[#64748B]">
            {conversation.lastMessage || "No messages yet"}
          </p>
        </div>
      </button>
    </li>
  );
}
