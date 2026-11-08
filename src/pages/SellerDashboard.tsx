import React, { useState } from 'react';
import {
  Store,
  DollarSign,
  Package,
  AlertTriangle,
  MessageSquare,
  FileText,
  ShieldCheck,
  ChevronRight,
  Gavel,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useDispute } from '../context/DisputeContext';
import { ChatWindow } from '../components/ChatWindow';
import { TrustBadge } from '../components/TrustBadge';
import { DisputeRoom } from '../components/DisputeRoom';

import { t } from '../lib/i18n';

export const SellerDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { activeConversation, setActiveConversationId } = useChat();
  const { disputes, activeDispute, setActiveDisputeId } = useDispute();

  const [activeTab, setActiveTab] = useState<'chat' | 'disputes' | 'profile'>('chat');
  const [viewingDisputeRoom, setViewingDisputeRoom] = useState(false);

  const lang = currentUser.preferredLanguage;

  // Filter disputes where this seller is respondent
  const sellerDisputes = disputes.filter((d) => d.sellerId === currentUser.id);

  const getLangBadge = (code: string) => {
    if (code === 'ta') return 'தமிழ் (Tamil) 🇮🇳';
    if (code === 'hi') return 'हिन्दी (Hindi) 🇮🇳';
    return 'English 🇬🇧';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {currentUser.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                {t('sellerPortal', lang)}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {getLangBadge(currentUser.preferredLanguage)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Store: Sharma Electronics & Crafts &bull; 42 Orders Completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TrustBadge user={currentUser} profile={userProfile} compact />
        </div>
      </div>

      {/* Seller Compliance Warning Banner if dispute active */}
      {sellerDisputes.some((d) => d.status !== 'RESOLVED') && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">
                Active Dispute Notice & Escrow Lock &bull; Ref: TB-DSP-2026-901
              </p>
              <p className="text-amber-800 mt-0.5">
                Buyer Ananya Krishnan reported off-platform wire solicitation. Escrow payout of $1,850.00 is
                currently restricted pending Trust Specialist review.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const dsp = sellerDisputes.find((d) => d.status !== 'RESOLVED') || sellerDisputes[0];
              setActiveDisputeId(dsp.id);
              setViewingDisputeRoom(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            Enter Dispute Room & Respond
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('chat');
              setViewingDisputeRoom(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'chat' && !viewingDisputeRoom
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Buyer Enquiries (Nexconn)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('disputes');
              setViewingDisputeRoom(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'disputes' && !viewingDisputeRoom
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Gavel className="w-4 h-4" />
            <span>Disputes ({sellerDisputes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setViewingDisputeRoom(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile' && !viewingDisputeRoom
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Reputation</span>
          </button>
        </div>

        {viewingDisputeRoom && (
          <button
            onClick={() => setViewingDisputeRoom(false)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            &larr; Back to Dashboard
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {viewingDisputeRoom && activeDispute ? (
        <DisputeRoom dispute={activeDispute} onBack={() => setViewingDisputeRoom(false)} />
      ) : activeTab === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Order Details & Escrow Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pending Order
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  IN ESCROW
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">Sony Alpha A7 IV Kit</h4>
                <p className="text-xs text-slate-500">Ref: TXN-2026-8849</p>
                <p className="text-base font-extrabold text-slate-900">$1,850.00 USD</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Buyer:</span>
                  <strong className="text-slate-900">Ananya Krishnan</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Buyer Language:</span>
                  <span>Tamil (தமிழ்)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Your Language:</span>
                  <span>Hindi (हिन्दी)</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                All messages are automatically translated between Tamil and Hindi using Nexconn Chat SDK engine.
              </div>
            </div>
          </div>

          {/* Central Chat Interface */}
          <div className="lg:col-span-3">
            <ChatWindow counterpartUserId="usr_buyer_1" />
          </div>
        </div>
      ) : activeTab === 'disputes' ? (
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Seller Dispute Notifications</h3>
          {sellerDisputes.map((dsp) => (
            <div
              key={dsp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 text-xs">{dsp.referenceId}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      dsp.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {dsp.status}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {dsp.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-800">{dsp.reason}</p>
                {dsp.resolutionOutcome && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Outcome: {dsp.resolutionOutcome} - "{dsp.resolutionNote}"
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setActiveDisputeId(dsp.id);
                  setViewingDisputeRoom(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Join Dispute Room
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl">
          <TrustBadge user={currentUser} profile={userProfile} />
        </div>
      )}
    </div>
  );
};
