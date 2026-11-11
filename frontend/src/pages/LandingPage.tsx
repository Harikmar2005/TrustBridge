import React from 'react';
import {
  ShieldCheck,
  Languages,
  Zap,
  Users,
  Lock,
  ArrowRight,
  Gavel,
  Radio,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
  setShowDemoStepper: (show: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentTab, setShowDemoStepper }) => {
  const { allUsers, switchUser, nexconnConnected } = useAuth();

  const handleLaunchRole = (role: UserRole) => {
    const user = allUsers.find((u) => u.role === role);
    if (user) {
      switchUser(user.id);
    }
    setCurrentTab(role);
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Nexconn Build Challenge 2026 &bull; Official AI Trust Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Making Marketplace Communication an{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Intelligent Trust & Safety Layer
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          TRUSTBRIDGE bridges buyers, sellers, and accredited support specialists with real-time Nexconn chat,
          zero-delay multilingual translation, explainable scam detection, and structured escrow dispute arbitration.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => {
              setShowDemoStepper(true);
              handleLaunchRole('buyer');
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-102"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch 11-Step Interactive Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleLaunchRole('admin')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Open Executive Analytics</span>
          </button>
        </div>

          {/* Integration Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 border-t border-slate-200/80 max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>Nexconn Web Chat SDK v26</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Languages className="w-4 h-4 text-blue-600" />
            <span>3 Languages (English 🇬🇧, Tamil 🇮🇳, Hindi 🇮🇳)</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Lock className="w-4 h-4 text-purple-600" />
            <span>Smart Escrow Safeguards</span>
          </div>
        </div>
      </section>

      {/* 4 Interactive Persona Entry Points */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Explore Dedicated User Roles
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Switch between personas instantly to test real-time cross-channel interactions in English, Tamil, and Hindi
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Buyer Persona */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-base">Buyer Portal</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                  EN / TA / HI
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Persona: Ananya Krishnan. Communicate in English, Tamil, or Hindi with live reciprocal translation,
                scam alerts, and escrow dispute filing.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3-Way Real-time Translation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scam Sentinel Warning Alerts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1-Click Escrow Freeze</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('buyer')}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Enter as Buyer
            </button>
          </div>

          {/* Seller Persona */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-base">Seller Portal</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                  EN / HI / TA
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Persona: Rajesh Sharma. Communicate in Hindi or English, receive instant buyer translations,
                and respond to dispute room notices.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>English & Hindi Negotiation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Escrow Order Management</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Submit Dispute Evidence</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('seller')}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Enter as Seller
            </button>
          </div>

          {/* Support Agent Persona */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Gavel className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-base">Support Agent</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                  ARBITRATOR
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Persona: Maya Patel. Smart-dispatched to high-priority cases, reviews AI threat context, joins
                3-party room, issues refund.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Dispatched Ticket Queue</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3-Party Nexconn Dispute Room</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Binding Escrow Rulings</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('support')}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Enter as Agent
            </button>
          </div>

          {/* Admin Persona */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-base">Admin Dashboard</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                  GOVERNANCE
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Persona: David Vance (Chief Trust Officer). Real-time telemetry, fraud alert triage, agent workload,
                and legal audit logs.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live Risk Distribution Charts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-Time Fraud Alerts Queue</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Immutable Audit Log Trail</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('admin')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Enter as Admin
            </button>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">
              System Architecture & Technical Excellence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Transforming Chat from an Insecure Channel into an Intelligent Trust Infrastructure
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h4 className="font-bold text-base text-white">Nexconn Real-Time Channel Core</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct and group channels instantiated with official <code>DirectChannel</code> and{' '}
                <code>GroupChannel</code> APIs, supporting presence, typing indicators, and encrypted delivery.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h4 className="font-bold text-base text-white">Explainable Gemini Scam Sentinel</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Analyzes payment redirection, credential theft (OTPs), domain phishing, and artificial deadline
                coercion. Generates explainable risk scores without fake claims of 100% certainty.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h4 className="font-bold text-base text-white">Smart Human Dispatch & 3-Way Rooms</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated triage and routing of flagged conversations into structured dispute rooms where accredited
                arbitrators review verified evidence and execute legally auditable escrow settlements.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
