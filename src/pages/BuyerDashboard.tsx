import React, { useState } from 'react';
import {
  ShieldCheck,
  Package,
  MessageSquare,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Lock,
  ExternalLink,
  ChevronRight,
  Gavel,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useDispute } from '../context/DisputeContext';
import { ChatWindow } from '../components/ChatWindow';
import { TrustBadge } from '../components/TrustBadge';
import { RaiseDisputeModal } from '../components/RaiseDisputeModal';
import { DisputeRoom } from '../components/DisputeRoom';

import { t } from '../lib/i18n';

export const BuyerDashboard: React.FC = () => {
  const { currentUser, userProfile, updateLanguage } = useAuth();
  const { activeConversation, setActiveConversationId } = useChat();
  const { disputes, activeDispute, setActiveDisputeId } = useDispute();

  const [activeTab, setActiveTab] = useState<'chat' | 'disputes' | 'profile'>('chat');
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [viewingDisputeRoom, setViewingDisputeRoom] = useState(false);

  const lang = currentUser.preferredLanguage;

  // Filter disputes involving this buyer
  const buyerDisputes = disputes.filter((d) => d.buyerId === currentUser.id);

  const handleDisputeCreated = (disputeId: string, roomId: string) => {
    setActiveDisputeId(disputeId);
    setActiveConversationId(roomId);
    setViewingDisputeRoom(true);
  };

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
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentUser.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                {t('buyerPortal', lang)}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {getLangBadge(currentUser.preferredLanguage)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Email: {currentUser.email} &bull; Member since Jan 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TrustBadge user={currentUser} profile={userProfile} compact />
          <button
            onClick={() => setIsDisputeModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Raise Dispute & Freeze Escrow</span>
          </button>
        </div>
      </div>

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
            <span>Universal Nexconn Chat</span>
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
            <span>My Disputes ({buyerDisputes.length})</span>
            {buyerDisputes.some((d) => d.status !== 'RESOLVED') && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
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
            <ShieldCheck className="w-4 h-4" />
            <span>Trust & Security Profile</span>
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

      {/* Main Tab View */}
      {viewingDisputeRoom && activeDispute ? (
        <DisputeRoom dispute={activeDispute} onBack={() => setViewingDisputeRoom(false)} />
      ) : activeTab === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Order Summary & Escrow Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Transaction
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  ESCROW ACTIVE
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Sony Alpha A7 IV Kit</h4>
                <p className="text-xs text-slate-500">Ref: TXN-2026-8849</p>
                <p className="text-base font-extrabold text-blue-600">$1,850.00 USD</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Seller:</span>
                  <strong className="text-slate-900">Rajesh Sharma</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Escrow Hold:</span>
                  <span className="text-emerald-700 font-semibold">Protected 100%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Language:</span>
                  <span>Tamil &harr; Hindi</span>
                </div>
              </div>

              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Report Suspicious Request
              </button>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
              <h5 className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                Buyer Safe Communication Rules
              </h5>
              <p className="text-[11px] leading-relaxed">
                TrustBridge will never ask for your SMS verification codes, bank OTPs, or demand payments outside the
                platform.
              </p>
            </div>
          </div>

          {/* Central Nexconn Chat Window */}
          <div className="lg:col-span-3">
            <ChatWindow onRaiseDispute={() => setIsDisputeModalOpen(true)} />
          </div>
        </div>
      ) : activeTab === 'disputes' ? (
        /* Disputes List View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">Registered Claims & Resolution Rooms</h3>
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              + File New Dispute
            </button>
          </div>

          {buyerDisputes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-40 text-emerald-600" />
              <p className="font-bold text-slate-700">No disputes filed</p>
              <p className="text-xs">All past orders completed smoothly with zero claims.</p>
            </div>
          ) : (
            buyerDisputes.map((dsp) => (
              <div
                key={dsp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 hover:border-blue-300 transition-colors"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 text-xs">{dsp.referenceId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        dsp.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {dsp.status}
                    </span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-600 font-semibold capitalize">
                      {dsp.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{dsp.reason}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Evidence files: {dsp.evidence.length}</span>
                    <span>&bull;</span>
                    <span>Assigned Arbitrator: Maya Patel</span>
                    <span>&bull;</span>
                    <span>{new Date(dsp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveDisputeId(dsp.id);
                      setViewingDisputeRoom(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <span>Enter Dispute Room</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Profile & Reputation View */
        <div className="max-w-2xl">
          <TrustBadge user={currentUser} profile={userProfile} />
        </div>
      )}

      {/* Raise Dispute Modal */}
      <RaiseDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        onSuccess={handleDisputeCreated}
      />
    </div>
  );
};
