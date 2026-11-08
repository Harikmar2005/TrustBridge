import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Flag,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Message } from '../types';
import { useChat } from '../context/ChatContext';

interface RiskAnalysisCardProps {
  message: Message;
  onRaiseDispute?: () => void;
}

export const RiskAnalysisCard: React.FC<RiskAnalysisCardProps> = ({ message, onRaiseDispute }) => {
  const { reportFalsePositive } = useChat();
  const [reported, setReported] = useState(message.isFalsePositive);
  const [submitting, setSubmitting] = useState(false);

  const handleReportFalsePositive = async () => {
    setSubmitting(true);
    await reportFalsePositive(message.id);
    setReported(true);
    setSubmitting(false);
  };

  const getSeverityStyle = (cat: string) => {
    switch (cat) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          badge: 'bg-red-600 text-white',
          text: 'text-red-900',
          icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          badge: 'bg-orange-500 text-white',
          text: 'text-orange-900',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          badge: 'bg-amber-500 text-white',
          text: 'text-amber-900',
          icon: <Info className="w-5 h-5 text-amber-600" />,
        };
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badge: 'bg-emerald-600 text-white',
          text: 'text-emerald-900',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
        };
    }
  };

  const style = getSeverityStyle(message.riskCategory);

  if (reported) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircle className="w-4 h-4 text-blue-600" />
          Reported as false positive. Feedback submitted to AI Safety Sentinel.
        </span>
        <span className="text-[10px] text-slate-400">Logged to audit trail</span>
      </div>
    );
  }

  return (
    <div className={`mt-2 rounded-xl p-3.5 border ${style.bg} ${style.border} transition-all shadow-xs`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {style.icon}
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${style.badge}`}>
                {message.riskCategory} RISK &bull; {message.riskScore}/100
              </span>
              <span className="text-[11px] font-bold text-slate-700">AI Trust & Scam Sentinel</span>
            </div>
            <p className="text-xs font-semibold text-slate-900 mt-0.5">
              Suspicious Communication Pattern Detected
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-slate-900">{message.riskScore}%</span>
          <p className="text-[10px] text-slate-500">Threat Weight</p>
        </div>
      </div>

      {/* Detected Indicators */}
      {message.detectedIndicators && message.detectedIndicators.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-slate-700 mb-1">Explainable Detected Signals:</p>
          <ul className="space-y-1">
            {message.detectedIndicators.map((indicator, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-800">
                <span className="text-red-500 font-bold">&bull;</span>
                <span>{indicator}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      {message.recommendedAction && (
        <div className="mt-3 p-2.5 bg-white/80 rounded-lg border border-slate-200/80 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Recommended Safety Action:
          </p>
          <p className="text-slate-700 mt-0.5 leading-relaxed">{message.recommendedAction}</p>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onRaiseDispute && message.riskScore >= 60 && (
            <button
              onClick={onRaiseDispute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Freeze Escrow & Raise Dispute
            </button>
          )}

          <button
            onClick={handleReportFalsePositive}
            disabled={submitting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-slate-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Report False Positive
          </button>
        </div>

        <span className="text-[10px] text-slate-500 font-medium">
          {message.detectionEngine === 'GEMINI_2_5_FLASH' ? (
            <span className="text-blue-700">Gemini 2.5 Flash Sentinel &bull; {Math.round((message.confidenceScore || 0.95) * 100)}% Confidence</span>
          ) : (
            <span className="text-slate-600">Multilingual Rule Sentinel &bull; {Math.round((message.confidenceScore || 0.95) * 100)}% Confidence</span>
          )}
        </span>
      </div>
    </div>
  );
};
