import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { RiskCategory, EvidenceReference } from '../../services/fraudEngine/types';
import { RiskBadge } from './RiskBadge';
import { RiskDetails } from './RiskDetails';

interface SecurityWarningProps {
  score: number;
  category: RiskCategory;
  explanation: string;
  recommendation: string;
  indicators: string[];
  evidence: EvidenceReference[];
  nlpScore?: number;
  urlScore?: number;
  behaviouralScore?: number;
  mlScore?: number;
  confidenceScore?: number;
  detectionEngine?: string;
  messageId?: string;
  onReportFalsePositive?: (messageId: string) => void;
  isFalsePositive?: boolean;
}

export const SecurityWarning: React.FC<SecurityWarningProps> = ({
  score,
  category,
  explanation,
  recommendation,
  indicators,
  evidence,
  nlpScore,
  urlScore,
  behaviouralScore,
  mlScore,
  confidenceScore,
  detectionEngine,
  messageId,
  onReportFalsePositive,
  isFalsePositive = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (category === 'LOW' && !isFalsePositive) {
    return null;
  }

  if (isFalsePositive) {
    return (
      <div className="my-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Marked as False Positive by User (Protection Warning Cleared)
        </span>
      </div>
    );
  }

  const isCritical = category === 'CRITICAL';
  const borderClass = isCritical ? 'border-red-300 bg-red-50/70' : 'border-amber-300 bg-amber-50/70';
  const textClass = isCritical ? 'text-red-900' : 'text-amber-900';
  const icon = isCritical ? (
    <AlertOctagon className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
  ) : (
    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
  );

  return (
    <div className={`my-2 p-3 rounded-xl border shadow-xs transition-all ${borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          {icon}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge score={score} category={category} size="sm" />
              <span className="font-bold text-xs text-slate-900">
                {isCritical ? 'High-Risk Threat Intercepted' : 'Scam Warning & Caution'}
              </span>
            </div>
            <p className={`text-xs font-semibold ${textClass}`}>{recommendation}</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">{explanation}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReportFalsePositive && messageId && (
            <button
              onClick={() => onReportFalsePositive(messageId)}
              className="text-[10px] text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
              title="Report if this warning is inaccurate"
            >
              <Flag className="w-3 h-3" />
              <span className="hidden sm:inline">False Positive?</span>
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-slate-600 hover:bg-white/80 transition-colors"
            title="Inspect AI Forensic Signals"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <RiskDetails
          nlpScore={nlpScore}
          urlScore={urlScore}
          behaviouralScore={behaviouralScore}
          mlScore={mlScore}
          confidenceScore={confidenceScore}
          detectionEngine={detectionEngine}
          indicators={indicators}
          evidence={evidence}
        />
      )}
    </div>
  );
};
