import React from 'react';
import { EvidenceReference } from '../../services/fraudEngine/types';
import { Shield, Sparkles, Terminal, Cpu, Link2, UserCheck, AlertCircle } from 'lucide-react';

interface RiskDetailsProps {
  nlpScore?: number;
  urlScore?: number;
  behaviouralScore?: number;
  mlScore?: number;
  confidenceScore?: number;
  detectionEngine?: string;
  indicators: string[];
  evidence: EvidenceReference[];
  modelVersion?: string;
}

export const RiskDetails: React.FC<RiskDetailsProps> = ({
  nlpScore = 0,
  urlScore = 0,
  behaviouralScore = 0,
  mlScore = 0,
  confidenceScore = 0.95,
  detectionEngine = 'HEURISTIC_RULE_ENGINE',
  indicators,
  evidence,
  modelVersion = 'v2.0-sentinel',
}) => {
  return (
    <div className="space-y-4 pt-3 border-t border-slate-200 text-xs">
      {/* 4-Vector Multi-Engine Score Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Multi-Vector Intelligence Signals
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Confidence: {(confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
              <Terminal className="w-3 h-3 text-blue-600" />
              <span>NLP (35%)</span>
            </div>
            <div className="text-base font-extrabold font-mono text-slate-800">{nlpScore}/100</div>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
              <Link2 className="w-3 h-3 text-amber-600" />
              <span>URL Intel (25%)</span>
            </div>
            <div className="text-base font-extrabold font-mono text-slate-800">{urlScore}/100</div>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Behavior (20%)</span>
            </div>
            <div className="text-base font-extrabold font-mono text-slate-800">{behaviouralScore}/100</div>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
              <Cpu className="w-3 h-3 text-purple-600" />
              <span>ML Classifier (20%)</span>
            </div>
            <div className="text-base font-extrabold font-mono text-slate-800">{mlScore}/100</div>
          </div>
        </div>
      </div>

      {/* Detected Indicator Tags */}
      {indicators.length > 0 && (
        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1.5">
            Detected Fraud Indicators
          </span>
          <div className="flex flex-wrap gap-1.5">
            {indicators.map((ind, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concrete Evidence Snippets */}
      {evidence.length > 0 && (
        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1.5">
            Forensic Evidence Snippets
          </span>
          <div className="space-y-1.5">
            {evidence.map((ev, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                    {ev.indicatorType}
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded font-mono">
                    Flagged
                  </span>
                </div>
                <div className="font-mono bg-white p-1 rounded border border-slate-200 text-slate-900 text-[11px]">
                  "{ev.textSnippet}"
                </div>
                <div className="text-[11px] text-slate-600 italic">{ev.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model & Provenance Badges */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 font-mono">
          <Cpu className="w-3 h-3 text-slate-400" />
          Model: {modelVersion}
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Sparkles className="w-3 h-3 text-purple-500" />
          Engine: {detectionEngine}
        </span>
      </div>
    </div>
  );
};
