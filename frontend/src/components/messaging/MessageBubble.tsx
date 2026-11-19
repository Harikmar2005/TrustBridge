import { AlertTriangle, Check, CheckCheck, Globe, Trash2 } from "lucide-react";
import type { ChatMessage } from "../../types/message";

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  onDelete: (messageId: string) => void;
  onTranslate: (message: ChatMessage) => void;
}

export default function MessageBubble({
  message,
  isMine,
  onDelete,
  onTranslate,
}: MessageBubbleProps) {
  const isFlagged =
    message.riskLevel === "HIGH" ||
    message.riskLevel === "CRITICAL" ||
    message.riskLevel === "MEDIUM";

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm sm:max-w-xl ${
          isMine
            ? "bg-[#102A3A] text-white"
            : "border border-slate-200 bg-white text-[#172B3A]"
        } ${message.isDeleted ? "italic opacity-70" : ""}`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>

        {isFlagged && !message.isDeleted && (
          <p
            className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${
              isMine ? "text-amber-300" : "text-[#D99A28]"
            }`}
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Risk pattern flagged ({message.riskLevel})</span>
          </p>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 px-1 text-[11px] text-[#64748B] tabular-nums">
        <span>{isMine ? "You" : message.senderName}</span>
        <span aria-hidden="true">·</span>
        <span>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {isMine && !message.isDeleted && (
          <>
            <span
              title={message.readByOther ? "Read" : "Delivered"}
              className="inline-flex items-center"
            >
              {message.readByOther ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#167C91]" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
            <button
              type="button"
              aria-label="Delete message"
              onClick={() => onDelete(message.id)}
              className="inline-flex items-center text-[#64748B] hover:text-[#D84B4B]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}

        {!message.isDeleted && (
          <button
            type="button"
            aria-label="Translate message"
            onClick={() => onTranslate(message)}
            className="inline-flex items-center gap-1 text-[#167C91] hover:underline"
          >
            <Globe className="h-3 w-3" />
            <span>Translate</span>
          </button>
        )}
      </div>
    </div>
  );
}
