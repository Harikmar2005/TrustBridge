import React from 'react';
import { Activity, CheckCircle, AlertCircle, Cpu } from 'lucide-react';

interface AIAnalysisStatusProps {
  detectorsHealth?: Record<string, string>;
  modelVersion?: string;
}

export const AIAnalysisStatus: React.FC<AIAnalysisStatusProps> = ({
  detectorsHealth = {
    nlpEngine: 'ONLINE',
    urlIntelligence: 'ONLINE',
    behaviouralEngine: 'ONLINE',
    mlClassifier: 'ONLINE',
    geminiAssistant: 'ONLINE',
  },
  modelVersion = 'v2.0-sentinel',
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
      <div className="flex items-center gap-1.5 font-bold text-slate-800">
        <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
        <span>TrustBridge AI Sentinel 2.0</span>
      </div>

      <span className="text-slate-300">|</span>

      <div className="flex items-center gap-3 text-[11px] text-slate-600">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          NLP: <span className="font-semibold text-emerald-700">Online</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          URL Intel: <span className="font-semibold text-emerald-700">Online</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          Behaviour: <span className="font-semibold text-emerald-700">Online</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          ML: <span className="font-semibold text-emerald-700">Online</span>
        </span>
      </div>

      <div className="ml-auto text-[10px] font-mono text-slate-500 flex items-center gap-1">
        <Cpu className="w-3 h-3 text-slate-400" />
        {modelVersion}
      </div>
    </div>
  );
};
