import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Languages,
  Paperclip,
  Image,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCheck,
  Check,
  Search,
  Filter,
  Info,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { LanguageCode, Message } from '../types';
import { RiskAnalysisCard } from './RiskAnalysisCard';
import { TrustBadge } from './TrustBadge';
import { RiskBadge } from './fraud/RiskBadge';
import { SecurityWarning } from './fraud/SecurityWarning';
import { URLRiskIndicator } from './fraud/URLRiskIndicator';
import { AnalyzedUrlDetail } from '../types';
import { t } from '../lib/i18n';

interface ChatWindowProps {
  onRaiseDispute?: () => void;
  counterpartUserId?: string;
}

const LANGUAGE_LABELS: Record<LanguageCode, { label: string; native: string; flag: string }> = {
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
  ta: { label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  hi: { label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ onRaiseDispute, counterpartUserId }) => {
  const { currentUser, allUsers, allProfiles, nexconnConnected } = useAuth();
  const {
    activeConversation,
    messages,
    sendMessage,
    isSending,
    selectedLanguage,
    setSelectedLanguage,
    displayMode,
    setDisplayMode,
    searchQuery,
    setSearchQuery,
    reportFalsePositive,
  } = useChat();

  const [inputContent, setInputContent] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [revealedOriginalMsgIds, setRevealedOriginalMsgIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const extractUrlDetails = (text: string, riskScore: number): AnalyzedUrlDetail[] => {
    const matches = text.match(/https?:\/\/[^\s<>"']+/gi);
    if (!matches) return [];
    return matches.map((rawUrl) => {
      try {
        const parsed = new URL(rawUrl);
        const hostname = parsed.hostname;
        const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
        const isShort = /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly/i.test(hostname);
        const hasDeceptive = /paypal|bank|secure|verify|account|wallet|update|login/i.test(hostname);
        const tld = hostname.split('.').pop() || '';
        return {
          url: rawUrl,
          domain: hostname,
          isIpHost: isIp,
          isShortener: isShort,
          isDeceptiveDomain: hasDeceptive || riskScore >= 70,
          isSsrfBlocked: false,
          tld,
          isSecureProtocol: parsed.protocol === 'https:',
          hasSuspiciousParams: /[?&](otp|token|code|pin|redirect|callback|dest)=/i.test(rawUrl),
          reputationStatus: riskScore >= 75 ? 'MALICIOUS' : riskScore >= 40 ? 'SUSPICIOUS' : 'SAFE',
        };
      } catch {
        return {
          url: rawUrl,
          domain: rawUrl.slice(0, 30),
          isIpHost: false,
          isShortener: false,
          isDeceptiveDomain: false,
          isSsrfBlocked: false,
          tld: '',
          isSecureProtocol: false,
          hasSuspiciousParams: false,
          reputationStatus: 'SUSPICIOUS',
        };
      }
    });
  };

  const lang = currentUser.preferredLanguage;

  // Identify counterpart
  const counterpartId =
    counterpartUserId ||
    (activeConversation?.buyerId === currentUser.id
      ? activeConversation?.sellerId
      : activeConversation?.buyerId) ||
    'usr_seller_1';

  const counterpartUser = allUsers.find((u) => u.id === counterpartId);
  const counterpartProfile = allProfiles[counterpartId];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim()) return;

    const textToSend = inputContent;
    setInputContent('');
    setSelectedAttachment(null);
    setShowAttachments(false);

    await sendMessage(textToSend, currentUser.preferredLanguage);
  };

  const toggleRevealOriginal = (msgId: string) => {
    setRevealedOriginalMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Demo shortcut messages for rapid testing across all 3 languages
  const sendDemoMessage = (text: string) => {
    setInputContent(text);
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orig = m.content.toLowerCase();
    const trans = (m.translations[selectedLanguage] || '').toLowerCase();
    return orig.includes(q) || trans.includes(q) || m.senderName.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-[740px] bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header: Counterparty Info & Language Toggles */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {counterpartUser ? (
            <div className="relative">
              <img
                src={counterpartUser.avatar}
                alt={counterpartUser.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              TB
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                {counterpartUser?.name || 'Sharma Electronics & Crafts'}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                {counterpartUser?.role || 'Seller'}
              </span>
              {counterpartUser && (
                <TrustBadge user={counterpartUser} profile={counterpartProfile} compact />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>Channel: {activeConversation?.nexconnChannelId || 'nc_direct_channel'}</span>
              <span>&bull;</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Nexconn Edge Synced (3-Way TLS)
              </span>
            </div>
          </div>
        </div>

        {/* Translation Mode & Language Bar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t('searchChat', lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setDisplayMode('translated')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                displayMode === 'translated'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('translatedMode', lang)}
            </button>
            <button
              onClick={() => setDisplayMode('both')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                displayMode === 'both' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('sideBySideMode', lang)}
            </button>
            <button
              onClick={() => setDisplayMode('original')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                displayMode === 'original'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('originalMode', lang)}
            </button>
          </div>

          {/* Quick Raise Dispute Button */}
          {onRaiseDispute && (
            <button
              onClick={onRaiseDispute}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Raise Dispute</span>
            </button>
          )}
        </div>
      </div>

      {/* Trust & Safety Protocol Banner */}
      <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{t('trustGuardActive', lang)}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200">
          <Languages className="w-3.5 h-3.5" />
          <span>
            {LANGUAGE_LABELS[selectedLanguage]?.flag} {LANGUAGE_LABELS[selectedLanguage]?.native} (
            {selectedLanguage.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Languages className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs">Start a real-time 3-way multilingual conversation below</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const translatedText = msg.translations[selectedLanguage] || msg.content;
            const hasTranslation = msg.translations[selectedLanguage] && msg.language !== selectedLanguage;
            const isOriginalExplicitlyToggled = revealedOriginalMsgIds.has(msg.id);
            const origLangDef = LANGUAGE_LABELS[msg.language as LanguageCode];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-3xl ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                {/* Sender Name, Timestamp & Original Language Tag */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700">{msg.senderName}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-600 uppercase font-semibold">
                    {msg.senderRole}
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  {/* Explicit Original Language Indicator */}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                    <span>Original:</span>
                    <span>{origLangDef?.flag || '🌐'}</span>
                    <span>{origLangDef?.label || msg.language}</span>
                  </span>

                  {/* TrustBridge AI 2.0 Risk Badge */}
                  {(msg.riskScore > 30 || msg.isFlagged) && (
                    <RiskBadge score={msg.riskScore} category={msg.riskCategory} size="sm" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 shadow-xs relative text-sm leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : msg.riskScore >= 60
                      ? 'bg-red-50 text-slate-900 border border-red-200 rounded-tl-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  {/* Content based on Display Mode or Individual Message Toggle */}
                  {displayMode === 'both' ? (
                    /* Side-by-Side Mode */
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-black/10 text-xs">
                        <span className="font-bold opacity-80 block mb-1">
                          Original ({origLangDef?.native || msg.language} {origLangDef?.flag}):
                        </span>
                        <p>{msg.content}</p>
                      </div>
                      <div className="pt-1">
                        <span className="font-bold opacity-80 block mb-1 text-xs">
                          Translated ({LANGUAGE_LABELS[selectedLanguage]?.native} {LANGUAGE_LABELS[selectedLanguage]?.flag}):
                        </span>
                        <p className="font-medium">{translatedText}</p>
                      </div>
                    </div>
                  ) : displayMode === 'original' || isOriginalExplicitlyToggled ? (
                    /* Original Mode */
                    <div>
                      <p className="font-medium">{msg.content}</p>
                      <div
                        className={`mt-2 pt-1.5 text-[10px] border-t flex items-center justify-between ${
                          isMe ? 'border-blue-500/60 text-blue-200' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <span>
                          Original Message ({origLangDef?.label} {origLangDef?.flag})
                        </span>
                        {hasTranslation && (
                          <button
                            type="button"
                            onClick={() => toggleRevealOriginal(msg.id)}
                            className="font-bold underline hover:opacity-80 ml-2"
                          >
                            View Translation &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Translated Mode (Default) */
                    <div>
                      <p className="font-medium">{translatedText}</p>
                      {hasTranslation && (
                        <div
                          className={`mt-2 pt-2 text-xs border-t flex items-center justify-between gap-2 ${
                            isMe ? 'border-blue-500/60 text-blue-100' : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Languages className="w-3.5 h-3.5" />
                            <span>
                              Translated from {origLangDef?.label || msg.language} {origLangDef?.flag}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleRevealOriginal(msg.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                              isMe
                                ? 'bg-blue-700/60 hover:bg-blue-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Show Original
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery & Read Receipt Verification */}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.deliveryStatus === 'READ' ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-cyan-300" />
                        <span>Read via Nexconn</span>
                      </>
                    ) : msg.deliveryStatus === 'DELIVERED_CLOUD' ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>{t('deliveredViaNexconn', lang)}</span>
                      </>
                    ) : msg.deliveryStatus === 'PENDING_CLOUD' ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-300 animate-spin" />
                        <span>Pending Cloud Sync</span>
                      </>
                    ) : msg.deliveryStatus === 'FAILED' ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-300" />
                        <span>Cloud Delivery Failed</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-slate-400" />
                        <span>{t('deliveredViaEscrowDb', lang)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Extracted URL Risk Indicators */}
                {extractUrlDetails(msg.content, msg.riskScore).length > 0 && (
                  <div className="w-full max-w-xl my-1.5 space-y-1">
                    {extractUrlDetails(msg.content, msg.riskScore).map((urlDet, uIdx) => (
                      <URLRiskIndicator key={uIdx} analyzedUrl={urlDet} />
                    ))}
                  </div>
                )}

                {/* AI Security Warning with Forensic Breakdown */}
                {msg.isFlagged && (
                  <div className="w-full max-w-xl">
                    <SecurityWarning
                      score={msg.riskScore}
                      category={msg.riskCategory}
                      explanation={msg.riskExplanation || (msg.detectedIndicators && msg.detectedIndicators[0]) || 'Suspicious communication pattern intercepted by multi-vector AI sentinel.'}
                      recommendation={msg.recommendedAction || 'Keep all communications and escrow payments strictly within TrustBridge.'}
                      indicators={msg.detectedIndicators || []}
                      evidence={(msg.detectedIndicators || []).map((ind) => ({
                        indicatorType: 'AI_SENTINEL_SIGNAL',
                        textSnippet: ind,
                        reason: ind,
                      }))}
                      confidenceScore={msg.confidenceScore}
                      detectionEngine={msg.detectionEngine}
                      messageId={msg.id}
                      onReportFalsePositive={reportFalsePositive}
                      isFalsePositive={msg.isFalsePositive}
                    />
                    {onRaiseDispute && msg.riskScore >= 60 && !msg.isFalsePositive && (
                      <div className="mt-1 flex justify-end">
                        <button
                          onClick={onRaiseDispute}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Freeze Escrow &amp; Raise Dispute
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Demo Prompt Chips (English, Tamil, Hindi, and Scam Test) */}
      <div className="px-4 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-slate-500 text-[11px] shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          {t('demoChipLabel', lang)}
        </span>

        {/* English Chip */}
        <button
          onClick={() =>
            sendDemoMessage(
              'Hello, could you share the warranty details, condition, and if the original battery charger is included?'
            )
          }
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-md text-slate-800 text-xs shrink-0 transition-colors font-medium"
        >
          {t('demoChipEnglish', lang)}
        </button>

        {/* Tamil Chip */}
        <button
          onClick={() =>
            sendDemoMessage(
              'வணக்கம், கேமராவை நேரில் பரிசோதிக்க முடியுமா? விலை சற்றே குறைக்கப்படுமா?'
            )
          }
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-md text-slate-800 text-xs shrink-0 transition-colors font-medium"
        >
          {t('demoChipTamil', lang)}
        </button>

        {/* Hindi Chip */}
        <button
          onClick={() =>
            sendDemoMessage(
              'हाँ, बिल्कुल नया लेंस भी साथ में फ्री मिलेगा। क्या आप ऑर्डर कन्फर्म कर रहे हैं?'
            )
          }
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-md text-slate-800 text-xs shrink-0 transition-colors font-medium"
        >
          {t('demoChipHindi', lang)}
        </button>

        {/* Scam Test Chip */}
        <button
          onClick={() =>
            sendDemoMessage(
              'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!'
            )
          }
          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 font-semibold rounded-md text-xs shrink-0 transition-colors"
        >
          {t('demoChipScam', lang)}
        </button>
      </div>

      {/* Attachment Preview if any */}
      {selectedAttachment && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <span className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-600" />
            Attached: <strong>{selectedAttachment}</strong>
          </span>
          <button
            onClick={() => setSelectedAttachment(null)}
            className="text-red-600 font-bold hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {/* Input Composer with Dynamic Localized Placeholder */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        {/* Attachment Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachments(!showAttachments)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Attach evidence or image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showAttachments && (
            <div className="absolute bottom-12 left-0 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30">
              <p className="text-[11px] font-bold text-slate-400 px-2 py-1">Attach Files</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedAttachment('camera_receipt_escrow.pdf');
                  setShowAttachments(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                Escrow Receipt (PDF)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAttachment('product_serial_photo.jpg');
                  setShowAttachments(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
              >
                <Image className="w-3.5 h-3.5 text-purple-600" />
                Product Photo (JPG)
              </button>
            </div>
          )}
        </div>

        {/* Text Input with Dynamic Localized Placeholder */}
        <input
          type="text"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          placeholder={t('chatPlaceholder', currentUser.preferredLanguage)}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputContent.trim() || isSending}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{t('send', lang)}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
