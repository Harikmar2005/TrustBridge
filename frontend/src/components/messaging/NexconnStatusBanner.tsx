import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  toNexconnDisplayStatus,
  type NexconnConnectionState,
  type NexconnReconnectNotice,
} from "../../utils/nexconnResilience";

interface NexconnStatusBannerProps {
  status: NexconnConnectionState;
  configured: boolean;
  error: string;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  manualReconnecting: boolean;
  reconnectNotice: NexconnReconnectNotice | null;
  onReconnect: () => void;
  onDismissNotice: () => void;
}

export default function NexconnStatusBanner({
  status,
  configured,
  error,
  reconnectAttempt,
  maxReconnectAttempts,
  manualReconnecting,
  reconnectNotice,
  onReconnect,
  onDismissNotice,
}: NexconnStatusBannerProps) {
  if (!configured || status === "unconfigured" || status === "idle") {
    return null;
  }

  const displayLabel = toNexconnDisplayStatus(status);
  if (!displayLabel) {
    return null;
  }

  const isDisconnectedOrError =
    status === "disconnected" || status === "error";
  const isReconnecting = status === "reconnecting" || manualReconnecting;
  const isConnecting = status === "connecting";

  const showReconnectButton =
    isDisconnectedOrError || manualReconnecting || isReconnecting;

  const bannerToneClass = isDisconnectedOrError
    ? "border-rose-200 bg-rose-50/90 text-[#102A3A]"
    : isReconnecting
      ? "border-amber-200 bg-amber-50/90 text-[#102A3A]"
      : reconnectNotice?.type === "success"
        ? "border-emerald-200 bg-emerald-50/90 text-[#102A3A]"
        : "border-slate-200 bg-[#F8FAFC] text-[#172B3A]";

  const dotClass =
    status === "connected"
      ? "bg-emerald-500"
      : isReconnecting || isConnecting
        ? "bg-amber-500 animate-pulse"
        : "bg-[#D84B4B]";

  const detailMessage = (() => {
    if (reconnectNotice) {
      return reconnectNotice.text;
    }
    if (isDisconnectedOrError) {
      return (
        error ||
        "Real-time connection disconnected. Fallback delivery remains active."
      );
    }
    if (status === "reconnecting") {
      if (reconnectAttempt > 0) {
        return `${error || "Reconnecting to real-time messaging..."} (attempt ${reconnectAttempt} of ${maxReconnectAttempts})`;
      }
      return error || "Reconnecting to real-time messaging...";
    }
    if (status === "connecting") {
      return "Establishing real-time messaging connection...";
    }
    return "";
  })();

  return (
    <div
      data-testid="nexconn-connection-banner"
      data-nexconn-status={status}
      role={isDisconnectedOrError || reconnectNotice?.type === "error" ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs transition-colors ${bannerToneClass}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
        <span className="shrink-0 font-semibold text-[#102A3A]">
          Real-time: {displayLabel}
        </span>

        {detailMessage && (
          <>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[#475569]">
              {reconnectNotice?.type === "success" && (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              )}
              {(isDisconnectedOrError || reconnectNotice?.type === "error") && (
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0 text-[#D84B4B]"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{detailMessage}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {reconnectNotice && !isDisconnectedOrError && !isReconnecting && (
          <button
            type="button"
            onClick={onDismissNotice}
            aria-label="Dismiss connection notice"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-[#64748B] hover:bg-black/5 hover:text-[#102A3A]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {showReconnectButton && (
          <button
            type="button"
            onClick={onReconnect}
            disabled={manualReconnecting}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#102A3A] shadow-2xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {manualReconnecting ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin text-[#167C91]"
                  aria-hidden="true"
                />
                <span>Reconnecting...</span>
              </>
            ) : (
              <>
                <RefreshCw
                  className="h-3.5 w-3.5 text-[#167C91]"
                  aria-hidden="true"
                />
                <span>Reconnect</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
