import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Flag,
  Globe,
  Loader2,
  MessageSquare,
  Scale,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteMessage,
  getConversationMessages,
  getConversations,
  markConversationRead,
  reportAccount,
  sendConversationMessage,
  translateMessage,
  type ChatMessage,
  type ConversationSummary,
} from "../services/api";

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
  const { user, socket } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>(routeConvId || "");
  const [search, setSearch] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [safetyNotice, setSafetyNotice] = useState("");

  // Translation modal state
  const [translatingMsg, setTranslatingMsg] = useState<ChatMessage | null>(null);
  const [targetLang, setTargetLang] = useState(user?.preferredLanguage || "en");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    configured: boolean;
    provider: string;
    originalText: string;
    translatedText: string | null;
    machineGenerated: boolean;
    notice: string;
  } | null>(null);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(
    "Off-platform payment solicitation"
  );
  const [reportDetails, setReportDetails] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!routeConvId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setSelectedId(routeConvId);
    });
    return () => {
      active = false;
    };
  }, [routeConvId]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      const list = (res.conversations as ConversationSummary[]) || [];
      setConversations(list);
    } catch (err) {
      setError(
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
        const res = await getConversations();
        if (!active) return;
        const list = (res.conversations as ConversationSummary[]) || [];
        setConversations(list);
        if (!routeConvId && list.length > 0) {
          setSelectedId((prev) => prev || list[0].id);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load conversations."
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
      await Promise.resolve();
      if (!active) return;
      setLoadingMsgs(true);
      setError("");
      setSafetyNotice("");
      try {
        const res = await getConversationMessages(selectedId);
        if (!active) return;
        setMessages((res.messages as ChatMessage[]) || []);
        setError("");
        await markConversationRead(selectedId);
        const convRes = await getConversations();
        if (active) {
          setConversations(
            (convRes.conversations as ConversationSummary[]) || []
          );
        }
      } catch (err) {
        if (active) {
          setMessages([]);
          setError(
            err instanceof Error ? err.message : "Unable to load messages."
          );
        }
      } finally {
        if (active) setLoadingMsgs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!socket || !selectedId) return;

    socket.emit("conversation:join", selectedId);

    const onNewMessage = (incoming: ChatMessage) => {
      if (incoming.conversationId !== selectedId) {
        void loadConversations();
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      if (incoming.senderId !== user?.id) {
        void markConversationRead(selectedId);
      }
      void loadConversations();
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
      void loadConversations();
    };

    socket.on("message:new", onNewMessage);
    socket.on("conversation:read", onRead);
    socket.on("message:deleted", onDeleted);

    return () => {
      socket.emit("conversation:leave", selectedId);
      socket.off("message:new", onNewMessage);
      socket.off("conversation:read", onRead);
      socket.off("message:deleted", onDeleted);
    };
  }, [socket, selectedId, user?.id, loadConversations]);

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

  const hasRiskyMessages = useMemo(
    () =>
      messages.some(
        (m) => m.riskLevel === "HIGH" || m.riskLevel === "CRITICAL" || m.riskLevel === "MEDIUM"
      ),
    [messages]
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !composerText.trim() || sending) return;
    setSending(true);
    setError("");
    setSafetyNotice("");
    try {
      const res = await sendConversationMessage(selectedId, composerText.trim());
      setComposerText("");
      if (res.safetyNotice && typeof res.safetyNotice === "string") {
        setSafetyNotice(res.safetyNotice);
      }
      const created = res.data as ChatMessage | undefined;
      if (created) {
        setMessages((prev) =>
          prev.some((m) => m.id === created.id) ? prev : [...prev, created]
        );
      }
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: "[Message removed by sender]" }
            : m
        )
      );
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove message.");
    }
  }

  async function handleOpenTranslate(msg: ChatMessage) {
    setTranslatingMsg(msg);
    setTranslationResult(null);
    setTranslationLoading(true);
    try {
      const res = await translateMessage(msg.id, targetLang);
      if (res.data) {
        setTranslationResult(res.data);
      }
    } catch (err) {
      setTranslationResult({
        configured: false,
        provider: "none",
        originalText: msg.content,
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
      const res = await translateMessage(translatingMsg.id, lang);
      if (res.data) {
        setTranslationResult(res.data);
      }
    } finally {
      setTranslationLoading(false);
    }
  }

  async function handleReportCounterparty() {
    if (!activeConversation) return;
    setReportFeedback("");
    try {
      const res = await reportAccount({
        reportedUserId: activeConversation.participantId,
        conversationId: activeConversation.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportFeedback(String(res.message || "Report submitted."));
      setReportDetails("");
      setTimeout(() => {
        setReportOpen(false);
        setReportFeedback("");
      }, 1200);
    } catch (err) {
      setReportFeedback(
        err instanceof Error ? err.message : "Unable to submit report."
      );
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:flex-row">
      {/* Left Conversation List */}
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 lg:w-80 lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-base font-bold text-[#102A3A]">Conversations</h1>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter threads..."
              aria-label="Filter conversations"
              className="w-full rounded-lg border border-slate-300 bg-[#F5F8FB] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#167C91] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-medium text-[#102A3A]">
                No conversations found
              </p>
              {user?.role !== "seller" ? (
                <Link
                  to="/sellers"
                  className="mt-2 inline-block text-xs font-semibold text-[#167C91] hover:underline"
                >
                  Explore Seller Directory
                </Link>
              ) : (
                <p className="mt-1 text-[11px] text-[#64748B]">
                  Buyer inquiries will appear here when a buyer starts a thread.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredConversations.map((conv) => {
                const active = conv.id === selectedId;
                const timestamp = conv.lastMessageAt || conv.updatedAt;
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(conv.id);
                        navigate(`/dashboard/messages/${conv.id}`);
                      }}
                      className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors ${
                        active ? "bg-[#E6F4F5]/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#102A3A]">
                          {conv.participantBusinessName || conv.participantName}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {timestamp && (
                            <span className="text-[11px] text-[#64748B] tabular-nums">
                              {new Date(timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="rounded-full bg-[#167C91] px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {conv.participantName} · {conv.participantRole}
                      </p>
                      <p className="truncate text-xs text-[#64748B]">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right Active Thread */}
      <section className="flex min-w-0 flex-1 flex-col bg-[#F5F8FB]">
        {!activeConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            {loadingMsgs ? (
              <Loader2 className="h-7 w-7 animate-spin text-[#167C91]" />
            ) : error ? (
              <div
                role="alert"
                className="max-w-md rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-[#D84B4B]"
              >
                <p className="font-semibold">Unable to open conversation</p>
                <p className="mt-1 text-xs">{error}</p>
              </div>
            ) : (
              <>
                <MessageSquare className="h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-base font-semibold text-[#102A3A]">
                  Select a conversation
                </h2>
                <p className="mt-1 max-w-sm text-xs text-[#64748B]">
                  {user?.role === "seller"
                    ? "Choose a buyer thread on the left to review inquiries and respond."
                    : "Choose a thread on the left or start a new conversation from the Seller Directory."}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-[#102A3A]">
                  {activeConversation.participantBusinessName ||
                    activeConversation.participantName}
                </h2>
                <p className="text-xs text-[#64748B]">
                  {activeConversation.participantName} ·{" "}
                  {activeConversation.participantRole}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/disputes?counterpartyId=${activeConversation.participantId}&conversationId=${activeConversation.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#172B3A] hover:bg-slate-50"
                >
                  <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Dispute</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#D84B4B]"
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Report</span>
                </button>
              </div>
            </header>

            {/* Safety Advisory Banner */}
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

            {/* Message Feed */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {loadingMsgs ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#167C91]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No messages in this thread yet. Introduce your inquiry below.
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = msg.senderId === user?.id;
                  const isFlagged =
                    msg.riskLevel === "HIGH" ||
                    msg.riskLevel === "CRITICAL" ||
                    msg.riskLevel === "MEDIUM";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        mine ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-xl rounded-xl px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-[#102A3A] text-white"
                            : "border border-slate-200 bg-white text-[#172B3A]"
                        } ${msg.isDeleted ? "italic opacity-70" : ""}`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>

                        {isFlagged && !msg.isDeleted && (
                          <p
                            className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${
                              mine ? "text-amber-300" : "text-[#D99A28]"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Risk pattern flagged ({msg.riskLevel})</span>
                          </p>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-[#64748B] tabular-nums">
                        <span>{mine ? "You" : msg.senderName}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {mine && !msg.isDeleted && (
                          <>
                            <span
                              title={msg.readByOther ? "Read" : "Delivered"}
                              className="inline-flex items-center"
                            >
                              {msg.readByOther ? (
                                <CheckCheck className="h-3.5 w-3.5 text-[#167C91]" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <button
                              type="button"
                              aria-label="Delete message"
                              onClick={() => void handleDelete(msg.id)}
                              className="inline-flex items-center text-[#64748B] hover:text-[#D84B4B]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}

                        {!msg.isDeleted && (
                          <button
                            type="button"
                            aria-label="Translate message"
                            onClick={() => void handleOpenTranslate(msg)}
                            className="inline-flex items-center gap-1 text-[#167C91] hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            <span>Translate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 border-t border-slate-200 bg-white p-4"
            >
              <input
                type="text"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="Write a message..."
                aria-label="Message content"
                maxLength={4000}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
              />
              <button
                type="submit"
                disabled={sending || !composerText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Send</span>
              </button>
            </form>
          </>
        )}
      </section>

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
              {reportFeedback && (
                <p className="text-xs font-medium text-[#167C91]">
                  {reportFeedback}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportFeedback("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#172B3A]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReportCounterparty()}
                  className="rounded-lg bg-[#D84B4B] px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
