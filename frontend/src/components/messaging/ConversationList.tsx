import { MessageSquare, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { ConversationSummary, UserRole } from "../../types/message";
import ConversationItem from "./ConversationItem";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onOpenNewConversation: () => void;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  userRole?: UserRole;
}

export default function ConversationList({
  conversations,
  selectedId,
  search,
  onSearchChange,
  onSelectConversation,
  onOpenNewConversation,
  loading,
  error,
  onRetry,
  userRole,
}: ConversationListProps) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-80 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-[#102A3A]">Conversations</h1>
          <button
            type="button"
            onClick={onOpenNewConversation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#167C91] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#105E6F]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New</span>
          </button>
        </div>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Filter conversations"
            className="w-full rounded-lg border border-slate-300 bg-[#F5F8FB] py-2 pl-9 pr-3 text-xs text-[#172B3A] outline-none transition-colors focus:border-[#167C91] focus:bg-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4" aria-label="Loading conversations">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : error && conversations.length === 0 ? (
          <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
            <p className="text-xs font-medium text-[#D84B4B]">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:bg-slate-50"
              >
                Retry
              </button>
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-[#102A3A]">
              {search.trim() ? "No matching conversations" : "No conversations yet"}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {search.trim()
                ? "Try searching by participant name or message content."
                : userRole === "buyer"
                  ? "Start a conversation with a verified seller or use New."
                  : "Buyer threads will appear here, or start one with a Buyer ID."}
            </p>
            {!search.trim() && userRole === "buyer" && (
              <Link
                to="/sellers"
                className="mt-3 inline-block text-xs font-semibold text-[#167C91] hover:underline"
              >
                Explore Seller Directory
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onSelect={onSelectConversation}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
