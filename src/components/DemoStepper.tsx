import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Languages,
  Users,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useDispute } from '../context/DisputeContext';

interface DemoStepperProps {
  setCurrentTab: (tab: string) => void;
  onClose: () => void;
}

interface StepDef {
  number: number;
  title: string;
  role: 'buyer' | 'seller' | 'support' | 'admin';
  description: string;
  actionLabel: string;
  tab: string;
}

const STEPS: StepDef[] = [
  {
    number: 1,
    title: 'Buyer Registers (Tamil / English)',
    role: 'buyer',
    description: 'Ananya Krishnan registers with preferred language Tamil (தமிழ்) or English (🇬🇧). Persistent preference saved in DB.',
    actionLabel: 'Switch to Buyer (Tamil)',
    tab: 'buyer',
  },
  {
    number: 2,
    title: 'Seller Registers (Hindi)',
    role: 'seller',
    description: 'Rajesh Sharma registers with preferred language Hindi (हिन्दी). Can independently toggle English or Tamil.',
    actionLabel: 'Switch to Seller (Hindi)',
    tab: 'seller',
  },
  {
    number: 3,
    title: 'Buyer Opens Nexconn Chat',
    role: 'buyer',
    description: 'Buyer connects through official Nexconn Chat SDK to discuss Sony Alpha A7 IV purchase in real-time.',
    actionLabel: 'Open Nexconn Chat',
    tab: 'buyer',
  },
  {
    number: 4,
    title: '3-Way Real-Time Translation',
    role: 'seller',
    description: 'Buyer sends Tamil enquiry. Seller receives real-time translated Hindi text with original preserved in all 3 languages.',
    actionLabel: 'View Translated Message',
    tab: 'seller',
  },
  {
    number: 5,
    title: 'Seller Sends Suspicious Link',
    role: 'seller',
    description: 'Seller demands ₹1,30,000 on unverified link pay-fast-direct.net and solicits 6-digit OTP in 10 mins.',
    actionLabel: 'Simulate Scam Message',
    tab: 'seller',
  },
  {
    number: 6,
    title: 'AI Sentinel (EN/TA/HI Analysis)',
    role: 'buyer',
    description: 'TrustBridge AI Sentinel analyzes threats in English, Tamil, and Hindi with 94/100 risk score and explainable cues.',
    actionLabel: 'Inspect AI Risk Warning',
    tab: 'buyer',
  },
  {
    number: 7,
    title: 'Buyer Reports & Raises Dispute',
    role: 'buyer',
    description: 'Buyer reports fraud, freezes escrow, and files formal dispute TB-DSP-2026-901 with evidence.',
    actionLabel: 'File Dispute & Evidence',
    tab: 'buyer',
  },
  {
    number: 8,
    title: 'Smart Agent Dispatch Assigned',
    role: 'support',
    description: 'System automatically creates support ticket TKT-2026-0501 and assigns Tier-1 Agent Maya Patel.',
    actionLabel: 'Inspect Agent Dispatch',
    tab: 'support',
  },
  {
    number: 9,
    title: 'Agent Joins Nexconn Dispute Room',
    role: 'support',
    description: 'Agent Maya Patel enters the 3-party dispute room with Buyer and Seller over Nexconn Group Channel.',
    actionLabel: 'Enter 3-Way Dispute Room',
    tab: 'support',
  },
  {
    number: 10,
    title: 'Agent Reviews & Resolves Dispute',
    role: 'support',
    description: 'Agent reviews transaction receipts, upholds buyer protection, and executes 100% Escrow Refund.',
    actionLabel: 'Issue Formal Resolution',
    tab: 'support',
  },
  {
    number: 11,
    title: 'Admin Metrics & Audit Updated',
    role: 'admin',
    description: 'Admin dashboard reflects live analytics, resolved dispute metrics, fraud alerts, and audit trails.',
    actionLabel: 'View Admin Analytics',
    tab: 'admin',
  },
];

export const DemoStepper: React.FC<DemoStepperProps> = ({ setCurrentTab, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { switchRole, updateLanguage, switchUser, allUsers } = useAuth();
  const { setActiveConversationId, sendMessage, conversations } = useChat();
  const { setActiveDisputeId, resolveDispute, resetDemoScenario } = useDispute();

  const currentStep = STEPS[currentStepIndex];

  const executeStep = async (index: number) => {
    setCurrentStepIndex(index);
    const step = STEPS[index];

    switch (step.number) {
      case 1: {
        // Buyer (Tamil)
        const buyer = allUsers.find((u) => u.role === 'buyer');
        if (buyer) switchUser(buyer.id);
        updateLanguage('ta');
        setCurrentTab('buyer');
        break;
      }
      case 2: {
        // Seller (Hindi)
        const seller = allUsers.find((u) => u.role === 'seller');
        if (seller) switchUser(seller.id);
        updateLanguage('hi');
        setCurrentTab('seller');
        break;
      }
      case 3: {
        // Buyer opens direct chat
        const buyer = allUsers.find((u) => u.role === 'buyer');
        if (buyer) switchUser(buyer.id);
        setActiveConversationId('conv_direct_1');
        setCurrentTab('buyer');
        break;
      }
      case 4: {
        // Seller sees Tamil translated to Hindi
        const seller = allUsers.find((u) => u.role === 'seller');
        if (seller) switchUser(seller.id);
        setActiveConversationId('conv_direct_1');
        setCurrentTab('seller');
        break;
      }
      case 5: {
        // Seller sends suspicious message
        const seller = allUsers.find((u) => u.role === 'seller');
        if (seller) switchUser(seller.id);
        setActiveConversationId('conv_direct_1');
        setCurrentTab('seller');
        break;
      }
      case 6: {
        // Buyer views AI risk warning
        const buyer = allUsers.find((u) => u.role === 'buyer');
        if (buyer) switchUser(buyer.id);
        setActiveConversationId('conv_direct_1');
        setCurrentTab('buyer');
        break;
      }
      case 7: {
        // Buyer raises dispute
        const buyer = allUsers.find((u) => u.role === 'buyer');
        if (buyer) switchUser(buyer.id);
        setActiveDisputeId('dsp_901');
        setCurrentTab('buyer');
        break;
      }
      case 8: {
        // Support agent dispatch
        const support = allUsers.find((u) => u.role === 'support');
        if (support) switchUser(support.id);
        setCurrentTab('support');
        break;
      }
      case 9: {
        // Support agent joins dispute room
        const support = allUsers.find((u) => u.role === 'support');
        if (support) switchUser(support.id);
        setActiveDisputeId('dsp_901');
        setActiveConversationId('conv_dispute_1');
        setCurrentTab('support');
        break;
      }
      case 10: {
        // Agent resolves dispute
        const support = allUsers.find((u) => u.role === 'support');
        if (support) switchUser(support.id);
        setActiveDisputeId('dsp_901');
        setCurrentTab('support');
        break;
      }
      case 11: {
        // Admin views metrics
        const admin = allUsers.find((u) => u.role === 'admin');
        if (admin) switchUser(admin.id);
        setCurrentTab('admin');
        break;
      }
    }
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Live Challenge Walkthrough (11 Mandatory Steps)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Step {currentStep.number} of 11
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Demonstrates end-to-end Nexconn chat, Tamil/Hindi translation, scam sentinel, smart dispatch & resolution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetDemoScenario}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset State
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Minimize
            </button>
          </div>
        </div>

        {/* Stepper Grid / Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-1.5 py-3 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            return (
              <button
                key={s.number}
                onClick={() => executeStep(idx)}
                className={`flex flex-col items-start p-2 rounded-lg text-left transition-all border ${
                  isCurrent
                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-xs'
                    : isPassed
                    ? 'bg-slate-800/80 border-emerald-600/40 text-slate-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : isPassed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isPassed ? <Check className="w-2.5 h-2.5" /> : s.number}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
                    {s.role}
                  </span>
                </div>
                <span className="text-[11px] font-semibold leading-tight line-clamp-1">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Action Callout */}
        <div className="mt-2 bg-gradient-to-r from-blue-950/60 via-slate-800/80 to-slate-800/60 border border-blue-500/30 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Active Step {currentStep.number}:</span>
                <span className="text-xs font-bold text-white">{currentStep.title}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{currentStep.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              disabled={currentStepIndex === 0}
              onClick={() => executeStep(currentStepIndex - 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => executeStep(currentStepIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {currentStep.actionLabel}
            </button>

            <button
              disabled={currentStepIndex === STEPS.length - 1}
              onClick={() => executeStep(currentStepIndex + 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
