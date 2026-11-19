import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ChatWindow from "../components/messaging/ChatWindow";
import ConversationList from "../components/messaging/ConversationList";
import NewConversationModal from "../components/messaging/NewConversationModal";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchConversationMessages,
  fetchConversations,
  markThreadRead,
  postMessage,
  removeMessage,
  reportConversationCounterparty,
  translateChatMessage,
} from "../services/messageService";
import type {
  ChatMessage,
  ConversationSummary,
  TranslationOutput,
} from "../types/message";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
];

export default function MessagesPage() {
  const { id: routeConvId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, socket, socketConnected } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>(routeConvId || "");
  const [search, setSearch] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convError, setConvError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedConvId, setLoadedConvId] = useState<string>("");
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [safetyNotice, setSafetyNotice] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);

  // Translation modal state
  const [translatingMsg, setTranslatingMsg] = useState<ChatMessage | null>(null);
  const [targetLang, setTargetLang] = useState(user?.preferredLanguage || "en");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationResult, setTranslationResult] =
    useState<TranslationOutput | null>(null);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(
    "Off-platform payment solicitation"
  );
  const [reportDetails, setReportDetails] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");
  const [reportError, setReportError] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const sendingRef = useRef(false);
  const initialSelectionDoneRef = useRef(false);
  const prevRouteConvIdRef = useRef<string | undefined>(routeConvId);

  useEffect(() => {
    const prevRoute = prevRouteConvIdRef.current;
    prevRouteConvIdRef.current = routeConvId;

    if (routeConvId) {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) setSelectedId(routeConvId);
      });
      return () => {
        active = false;
      };
    }

    if (prevRoute && !routeConvId) {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) setSelectedId("");
      });
      return () => {
        active = false;
      };
    }
  }, [routeConvId]);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
      setConvError("");
    } catch (err) {
      setConvError(
        err instanceof Error ? err.message : "Unable to load conversations."
      );
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await fetchConversations();
        if (!active) return;
        setConversations(list);
        setConvError("");
        if (!initialSelectionDoneRef.current) {
          initialSelectionDoneRef.current = true;
          const isDesktop =
            typeof window !== "undefined" && window.innerWidth >= 1024;
          if (!routeConvId && isDesktop && list.length > 0) {
            setSelectedId((prev) => prev || list[0].id);
          }
        }
      } catch (err) {
        if (active) {
          setConvError(
            err instanceof Error
              ? err.message
              : "Unable to load conversations."
          );
        }
      } finally {
        if (active) setLoadingConvs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [routeConvId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const msgs = await fetchConversationMessages(selectedId);
        if (!active) return;
        setMessages(msgs);
        setLoadedConvId(selectedId);
        setError("");
        await markThreadRead(selectedId);
        const list = await fetchConversations();
        if (active) {
          setConversations(list);
        }
      } catch (err) {
        if (active) {
          setMessages([]);
          setLoadedConvId(selectedId);
          setError(
            err instanceof Error ? err.message : "Unable to load messages."
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Socket.IO real-time updates across active and sidebar conversations
  useEffect(() => {
    if (!socket) return;

    const joinActive = () => {
      if (selectedId) {
        socket.emit("conversation:join", selectedId);
      }
    };

    joinActive();

    const onNewMessage = (incoming: ChatMessage) => {
      if (incoming.conversationId !== selectedId) {
        void refreshConversations();
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      if (incoming.senderId !== user?.id) {
        void markThreadRead(selectedId);
      }
      void refreshConversations();
    };

    const onNotificationNew = () => {
      void refreshConversations();
    };

    const onRead = (evt: { conversationId: string; readerId: string }) => {
      if (evt.conversationId !== selectedId || evt.readerId === user?.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === user?.id ? { ...m, readByOther: true } : m
        )
      );
    };

    const onDeleted = (evt: { messageId: string; conversationId: string }) => {
      if (evt.conversationId !== selectedId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === evt.messageId
            ? { ...m, isDeleted: true, content: "[Message removed by sender]" }
            : m
        )
      );
      void refreshConversations();
    };

    socket.on("connect", joinActive);
    socket.on("message:new", onNewMessage);
    socket.on("notification:new", onNotificationNew);
    socket.on("conversation:read", onRead);
    socket.on("message:deleted", onDeleted);

    return () => {
      if (selectedId) {
        socket.emit("conversation:leave", selectedId);
      }
      socket.off("connect", joinActive);
      socket.off("message:new", onNewMessage);
      socket.off("notification:new", onNotificationNew);
      socket.off("conversation:read", onRead);
      socket.off("message:deleted", onDeleted);
    };
  }, [socket, selectedId, user?.id, refreshConversations]);

  // Polling fallback when Socket.IO is disconnected
  useEffect(() => {
    if (socketConnected) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshConversations();
      if (selectedId) {
        void fetchConversationMessages(selectedId)
          .then((msgs) => setMessages(msgs))
          .catch(() => {
            // Keep UI quiet on background poll errors
          });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [socketConnected, selectedId, refreshConversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.participantName} ${c.participantBusinessName || ""} ${c.lastMessage || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [conversations, search]);

  function handleSelectConversation(id: string) {
    setSelectedId(id);
    setSafetyNotice("");
    setError("");
    navigate(`/dashboard/messages/${id}`);
  }

  function handleBackToList() {
    setSelectedId("");
    setError("");
    setSafetyNotice("");
    navigate("/dashboard/messages");
  }

  async function handleSend() {
    const trimmed = composerText.trim();
    if (!selectedId || !trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    setSafetyNotice("");
    try {
      const result = await postMessage(selectedId, trimmed);
      setComposerText("");
      if (result.safetyNotice) {
        setSafetyNotice(result.safetyNotice);
      }
      if (result.message) {
        const created = result.message;
        setMessages((prev) =>
          prev.some((m) => m.id === created.id) ? prev : [...prev, created]
        );
      }
      await refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await removeMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: "[Message removed by sender]" }
            : m
        )
      );
      await refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove message.");
    }
  }

  async function handleOpenTranslate(msg: ChatMessage) {
    setTranslatingMsg(msg);
    setTranslationResult(null);
    setTranslationLoading(true);
    try {
      const output = await translateChatMessage(msg.id, targetLang);
      if (output) {
        setTranslationResult(output);
      }
    } catch (err) {
      setTranslationResult({
        configured: false,
        provider: "none",
        originalText: msg.content,
        targetLanguage: targetLang,
        translatedText: null,
        machineGenerated: false,
        notice:
          err instanceof Error
            ? err.message
            : "Translation service unavailable.",
      });
    } finally {
      setTranslationLoading(false);
    }
  }

  async function handleRunTranslateAgain(lang: string) {
    setTargetLang(lang);
    if (!translatingMsg) return;
    setTranslationLoading(true);
    try {
      const output = await translateChatMessage(translatingMsg.id, lang);
      if (output) {
        setTranslationResult(output);
      }
    } catch (err) {
      setTranslationResult({
        configured: false,
        provider: "none",
        originalText: translatingMsg.content,
        targetLanguage: lang,
        translatedText: null,
        machineGenerated: false,
        notice:
          err instanceof Error
            ? err.message
            : "Translation service unavailable.",
      });
    } finally {
      setTranslationLoading(false);
    }
  }

  async function handleReportCounterparty() {
    if (!activeConversation || submittingReport) return;
    if (reportDetails.trim().length < 10) {
      setReportError("Please provide at least 10 characters of details.");
      setReportFeedback("");
      return;
    }
    setSubmittingReport(true);
    setReportError("");
    setReportFeedback("");
    try {
      const msg = await reportConversationCounterparty({
        reportedUserId: activeConversation.participantId,
        conversationId: activeConversation.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setReportFeedback(msg);
      setReportDetails("");
      setTimeout(() => {
        setReportOpen(false);
        setReportFeedback("");
        setReportError("");
      }, 1200);
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Unable to submit report."
      );
    } finally {
      setSubmittingReport(false);
    }
  }

  const loadingMessages = Boolean(selectedId) && loadedConvId !== selectedId;
  const showChatOnMobile = Boolean(selectedId);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:flex-row">
      <div
        className={`${
          showChatOnMobile ? "hidden lg:flex" : "flex flex-1 lg:flex-none"
        } min-h-0 flex-col`}
      >
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          onSelectConversation={handleSelectConversation}
          onOpenNewConversation={() => setNewConvOpen(true)}
          loading={loadingConvs}
          error={convError}
          onRetry={() => void refreshConversations()}
          userRole={user?.role}
        />
      </div>

      <div
        className={`${
          showChatOnMobile ? "flex" : "hidden lg:flex"
        } min-h-0 min-w-0 flex-1 flex-col`}
      >
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId={user?.id}
          loading={loadingMessages}
          error={error}
          safetyNotice={safetyNotice}
          composerText={composerText}
          sending={sending}
          onComposerChange={setComposerText}
          onSend={() => void handleSend()}
          onDeleteMessage={(id) => void handleDelete(id)}
          onTranslateMessage={(msg) => void handleOpenTranslate(msg)}
          onOpenReport={() => {
            setReportError("");
            setReportFeedback("");
            setReportOpen(true);
          }}
          onBackToList={handleBackToList}
          onOpenNewConversation={() => setNewConvOpen(true)}
        />
      </div>

      <NewConversationModal
        open={newConvOpen}
        currentUserId={user?.id}
        currentUserRole={user?.role}
        onClose={() => setNewConvOpen(false)}
        onCreated={(conversationId) => {
          setNewConvOpen(false);
          void refreshConversations();
          handleSelectConversation(conversationId);
        }}
      />

      {/* Translation Modal */}
      {translatingMsg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="translate-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2
                id="translate-modal-title"
                className="flex items-center gap-2 text-base font-semibold text-[#102A3A]"
              >
                <Globe className="h-5 w-5 text-[#167C91]" />
                <span>Message Translation Assistant</span>
              </h2>
              <select
                aria-label="Target translation language"
                value={targetLang}
                onChange={(e) => void handleRunTranslateAgain(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs outline-none focus:border-[#167C91]"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-[#F5F8FB] p-3">
                <p className="text-xs font-semibold text-[#64748B]">
                  Original message
                </p>
                <p className="mt-1 text-[#172B3A]">{translatingMsg.content}</p>
              </div>

              {translationLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#167C91]" />
                  <span>Contacting translation provider...</span>
                </div>
              ) : translationResult ? (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-[#102A3A]">
                    {translationResult.configured
                      ? `Machine-translated output (${translationResult.provider})`
                      : "Translation provider not configured"}
                  </p>
                  {translationResult.translatedText ? (
                    <p className="mt-1 text-[#172B3A]">
                      {translationResult.translatedText}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#64748B]">
                    {translationResult.notice}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setTranslatingMsg(null);
                  setTranslationResult(null);
                }}
                className="rounded-lg bg-[#102A3A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && activeConversation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conv-report-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h2
              id="conv-report-title"
              className="text-base font-semibold text-[#102A3A]"
            >
              Report {activeConversation.participantName}
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Submitted reports flag this conversation for administrator review without automatically penalizing the account.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="conv-report-reason"
                  className="block text-xs font-semibold text-[#172B3A]"
                >
                  Reason
                </label>
                <select
                  id="conv-report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                >
                  <option>Off-platform payment solicitation</option>
                  <option>Phishing or suspicious external link</option>
                  <option>Harassment or coercion</option>
                  <option>Impersonation or false business claims</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="conv-report-details"
                  className="block text-xs font-semibold text-[#172B3A]"
                >
                  Details
                </label>
                <textarea
                  id="conv-report-details"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide specific details (min 10 characters)..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                />
              </div>
              {reportError && (
                <p role="alert" className="text-xs font-medium text-[#D84B4B]">
                  {reportError}
                </p>
              )}
              {reportFeedback && (
                <p role="status" className="text-xs font-medium text-[#167C91]">
                  {reportFeedback}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportFeedback("");
                    setReportError("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#172B3A]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReport}
                  onClick={() => void handleReportCounterparty()}
                  className="rounded-lg bg-[#D84B4B] px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
