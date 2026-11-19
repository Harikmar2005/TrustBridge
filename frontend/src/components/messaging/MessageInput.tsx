import { Loader2, Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sending: boolean;
  disabled?: boolean;
}

const MAX_LENGTH = 4000;

export default function MessageInput({
  value,
  onChange,
  onSubmit,
  sending,
  disabled = false,
}: MessageInputProps) {
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || sending || disabled) return;
    onSubmit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || sending || disabled) return;
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="flex items-end gap-2.5 sm:gap-3">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          aria-label="Message content"
          maxLength={MAX_LENGTH}
          disabled={sending || disabled}
          className="max-h-36 min-h-[42px] flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-5 text-[#172B3A] outline-none transition-colors focus:border-[#167C91] disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={sending || disabled || !value.trim()}
          className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-lg bg-[#167C91] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{sending ? "Sending..." : "Send"}</span>
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
        <span>Enter to send · Shift+Enter for new line</span>
        {value.length > 3500 && (
          <span className="tabular-nums">
            {value.length} / {MAX_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
