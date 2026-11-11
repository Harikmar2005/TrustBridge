import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  Clock,
  ArrowRight,
  Gavel,
  AlertTriangle,
  User,
  Users,
  FileText,
  Sparkles,
  Inbox,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDispute } from '../context/DisputeContext';
import { useChat } from '../context/ChatContext';
import { DisputeRoom } from '../components/DisputeRoom';
import { t } from '../lib/i18n';

export const SupportDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { disputes, tickets, activeDispute, setActiveDisputeId } = useDispute();
  const { setActiveConversationId } = useChat();

  const lang = currentUser.preferredLanguage;

  const [selectedTicketId, setSelectedTicketId] = useState<string>('tkt_501');
  const [viewingRoom, setViewingRoom] = useState(false);

  // Tickets assigned to this agent
  const agentTickets = tickets;
  const activeTicket = agentTickets.find((t) => t.id === selectedTicketId) || agentTickets[0];

  const handleJoinDisputeRoom = (disputeId?: string) => {
    if (!disputeId) return;
    setActiveDisputeId(disputeId);
    setActiveConversationId('conv_dispute_1');
    setViewingRoom(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Agent Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentUser.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">
                Tier-1 Trust Arbitrator
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online &bull; Smart Dispatch Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Resolution Operations Specialist &bull; 340+ Verified Escrow Arbitrations
            </p>
          </div>
        </div>

        {/* Agent Performance KPI Cards */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-sm font-extrabold text-slate-900">4.9/5.0</span>
            <span className="text-[10px] text-slate-500 block uppercase">Arbitration Rating</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-sm font-extrabold text-emerald-600">14 min</span>
            <span className="text-[10px] text-slate-500 block uppercase">Avg Response Time</span>
          </div>
        </div>
      </div>

      {viewingRoom && activeDispute ? (
        <DisputeRoom dispute={activeDispute} onBack={() => setViewingRoom(false)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Support Ticket Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-purple-600" />
                Assigned Case Queue ({agentTickets.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Auto-Dispatched</span>
            </div>

            <div className="space-y-2">
              {agentTickets.map((ticket) => {
                const isSelected = ticket.id === activeTicket?.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900">{ticket.ticketNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          ticket.priority === 'URGENT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{ticket.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{ticket.summary}</p>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-600">{ticket.category}</span>
                      <span
                        className={`font-bold uppercase ${
                          ticket.status === 'RESOLVED' ? 'text-emerald-600' : 'text-blue-600'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Case Context & Smart Dispatch Details */}
          <div className="lg:col-span-2 space-y-6">
            {activeTicket ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">{activeTicket.title}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        {activeTicket.priority} PRIORITY
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Case Ref: {activeTicket.ticketNumber} &bull; Created{' '}
                      {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {activeTicket.disputeId && (
                    <button
                      onClick={() => handleJoinDisputeRoom(activeTicket.disputeId)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all hover:scale-102"
                    >
                      <Gavel className="w-4 h-4" />
                      <span>Join Nexconn Dispute Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* AI Executive Case Brief */}
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <Sparkles className="w-4 h-4 text-purple-700" />
                    <span>AI Dispatch Triage Summary</span>
                    <span className="text-[10px] font-semibold text-purple-700 opacity-75">
                      (Gemini 2.5 Flash Sentinel)
                    </span>
                  </div>
                  <p className="text-xs text-purple-950 leading-relaxed">{activeTicket.summary}</p>
                  <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-[11px] text-purple-800">
                    <span>Evaluated Threat Score: 94/100 (CRITICAL)</span>
                    <span>Recommended Resolution: Full Escrow Refund & Seller Probation</span>
                  </div>
                </div>

                {/* Transaction Context */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Associated Marketplace Transaction
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Order Ref</span>
                      <strong className="text-slate-900">TXN-2026-8849</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Item</span>
                      <strong className="text-slate-900">Sony Alpha A7 IV Kit</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Escrow Value</span>
                      <strong className="text-blue-700 font-extrabold">$1,850.00 USD</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Escrow Status</span>
                      <span className="font-bold text-amber-700">LOCKED PENDING REVIEW</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Workflow Progress */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Smart Human Agent Dispatch Pipeline
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="font-bold text-emerald-800 block">1. User Incident Report</span>
                      <p className="text-[11px] text-emerald-700">Buyer flagged suspicious OTP demand</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="font-bold text-emerald-800 block">2. AI Risk Triage</span>
                      <p className="text-[11px] text-emerald-700">Threat 94% &bull; URGENT priority assigned</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="font-bold text-emerald-800 block">3. Agent Matched</span>
                      <p className="text-[11px] text-emerald-700">Maya Patel dispatched to channel</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <span className="font-bold text-purple-800 block">4. Active Arbitration</span>
                      <p className="text-[11px] text-purple-700">Nexconn 3-party room in progress</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
                <Headphones className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-slate-700">No ticket selected</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
