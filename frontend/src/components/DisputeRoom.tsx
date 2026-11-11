import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  Users,
  FileText,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Gavel,
  History,
  Lock,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Dispute, DisputeStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDispute } from '../context/DisputeContext';
import { ChatWindow } from './ChatWindow';

interface DisputeRoomProps {
  dispute: Dispute;
  onBack?: () => void;
}

export const DisputeRoom: React.FC<DisputeRoomProps> = ({ dispute, onBack }) => {
  const { currentUser, allUsers } = useAuth();
  const { resolveDispute } = useDispute();

  const [resolutionOutcome, setResolutionOutcome] = useState<
    'FULL_REFUND' | 'PARTIAL_REFUND' | 'FUNDS_RELEASED' | 'DISMISSED'
  >('FULL_REFUND');
  const [resolutionNotes, setResolutionNotes] = useState(
    'Investigation complete. Confirmed seller attempted off-platform wire fraud and requested confidential OTP. 100% Escrow of $1,850.00 returned to buyer Ananya Krishnan. Seller account assigned Probation Tier.'
  );
  const [isResolving, setIsResolving] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'evidence' | 'timeline'>('chat');

  const buyer = allUsers.find((u) => u.id === dispute.buyerId);
  const seller = allUsers.find((u) => u.id === dispute.sellerId);
  const agent = allUsers.find((u) => u.id === dispute.assignedAgentId);

  const canArbitrate = currentUser.role === 'support' || currentUser.role === 'admin';

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) return;
    setIsResolving(true);
    try {
      await resolveDispute(dispute.id, resolutionOutcome, resolutionNotes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Dispute ID, Escrow & Priority */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-100 text-red-700">
                <Gavel className="w-5 h-5 stroke-[2.2]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Dispute Resolution Room: {dispute.referenceId}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${getStatusBadge(
                      dispute.status
                    )}`}
                  >
                    {dispute.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 uppercase">
                    {dispute.priority} PRIORITY
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: <strong className="text-slate-800 capitalize">{dispute.category.replace(/_/g, ' ')}</strong> &bull;
                  Channel:{' '}
                  <span className="font-mono text-blue-600 font-semibold">nc_room_{dispute.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Escrow Vault Protected Notice */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Lock className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Protected Escrow Vault
              </span>
              <span className="text-base font-extrabold text-slate-900">$1,850.00 USD</span>
            </div>
          </div>
        </div>

        {/* 3-Party Room Participants & AI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Buyer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <img
              src={buyer?.avatar}
              alt="Buyer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Buyer (Complainant)
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">{buyer?.name}</p>
              <p className="text-[11px] text-slate-500">Tamil (தமிழ்) &bull; Trust 94/100</p>
            </div>
          </div>

          {/* Seller */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <img
              src={seller?.avatar}
              alt="Seller"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Seller (Respondent)
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">{seller?.name}</p>
              <p className="text-[11px] text-slate-500">Hindi (हिन्दी) &bull; Trust 68/100</p>
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center gap-3">
            <img
              src={agent?.avatar}
              alt="Agent"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/40"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-700" />
                Assigned Trust Arbitrator
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">{agent?.name}</p>
              <p className="text-[11px] text-purple-700 font-medium">Smart Dispatch Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Evidence, Reason & Auditable Timeline */}
        <div className="space-y-6">
          {/* Dispute Context & Evidence Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Case Statement & Allegations
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{dispute.reason}"
              </p>
            </div>

            {/* Evidence Files */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Submitted Evidence ({dispute.evidence.length})</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Cryptographically Verified</span>
              </h4>
              <div className="space-y-2">
                {dispute.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-slate-800 truncate">{ev.fileName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{ev.description}</p>
                      </div>
                    </div>
                    <a
                      href={ev.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Inspect evidence image"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Auditable Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                Audit Trail & Event Log
              </h4>
              <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 text-xs">
                {dispute.history.map((h) => (
                  <div key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <p className="font-bold text-slate-900">{h.actionTaken}</p>
                    <p className="text-[11px] text-slate-500">{h.note}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formal Arbitration Ruling Box (For Agent/Admin) */}
          {canArbitrate && dispute.status !== 'RESOLVED' && (
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Gavel className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Trust Agent Arbitration Authority</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Binding Resolution Ruling
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('FULL_REFUND')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionOutcome === 'FULL_REFUND'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    100% Escrow Refund to Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('FUNDS_RELEASED')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionOutcome === 'FUNDS_RELEASED'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Release Escrow to Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('PARTIAL_REFUND')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionOutcome === 'PARTIAL_REFUND'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    50/50 Mutual Compromise
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('DISMISSED')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionOutcome === 'DISMISSED'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Dismiss Claim
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Formal Legal Justification / Ruling Note
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleResolve}
                disabled={isResolving || !resolutionNotes.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isResolving ? 'Enforcing Settlement...' : 'Enforce Settlement & Close Dispute'}</span>
              </button>
            </div>
          )}

          {/* Resolved Outcome Card */}
          {dispute.status === 'RESOLVED' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-emerald-900">
                  Formally Resolved: {dispute.resolutionOutcome || 'FULL_REFUND'}
                </h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">"{dispute.resolutionNote}"</p>
              <div className="pt-2 border-t border-emerald-200 text-[11px] font-mono text-emerald-700 flex items-center justify-between">
                <span>Escrow Settlement Executed</span>
                <span>Audit Ref: {dispute.referenceId}-AUDIT</span>
              </div>
            </div>
          )}
        </div>

        {/* Center/Right Column: 3-Party Nexconn Group Chat Room */}
        <div className="lg:col-span-2">
          <ChatWindow counterpartUserId={dispute.sellerId} />
        </div>
      </div>
    </div>
  );
};
