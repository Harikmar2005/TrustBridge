import React, { useState } from 'react';
import { UnifiedRiskReport, URLIntelligenceResult } from '../../types';
import { RiskBadge } from './RiskBadge';
import { RiskDetails } from './RiskDetails';
import { URLRiskIndicator } from './URLRiskIndicator';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ShieldCheck, Search, Sparkles, AlertOctagon, Terminal, Link2, RefreshCw } from 'lucide-react';

export const FraudAnalysisPanel: React.FC = () => {
  const { authToken } = useAuth();
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<UnifiedRiskReport | null>(null);
  const [urlReport, setUrlReport] = useState<URLIntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);
    setError(null);
    setReport(null);
    setUrlReport(null);

    try {
      const data = await api.post<UnifiedRiskReport>('/api/v1/fraud/analyze', {
        content: inputText,
        persist: false,
      });
      setReport(data);

      // Also check if text contains URL and run dedicated URL inspection
      if (/https?:\/\/|[a-z0-9-]+\.(?:xyz|top|net|co|biz)/i.test(inputText)) {
        try {
          const uData = await api.post<URLIntelligenceResult>('/api/v1/fraud/analyze-url', {
            url: inputText,
          });
          setUrlReport(uData);
        } catch {
          // Non-blocking URL inspection
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to reach AI analysis engine');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadExample = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">TrustBridge AI 2.0 Security Sandbox</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">Real-time Multi-Vector Inference</span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Inspect Message Text or URL
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="Paste any peer message, external link, or payment request to run real-time multi-vector AI inspection..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
          />
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Sample Presets:</span>
          <button
            onClick={() =>
              loadExample(
                'Please send ₹1,30,000 to http://pay-fast-direct.net/upi/deal88 and share your 6-digit OTP right now or offer cancelled in 10 minutes!'
              )
            }
            className="px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium"
          >
            Critical Phishing & OTP
          </button>
          <button
            onClick={() =>
              loadExample('Ping me on Telegram @deal_fast_direct to skip 10% platform commission.')
            }
            className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium"
          >
            Telegram Fee Evasion
          </button>
          <button
            onClick={() => loadExample('http://169.254.169.254/latest/meta-data/')}
            className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium"
          >
            SSRF Metadata Probe
          </button>
          <button
            onClick={() =>
              loadExample(
                'Hello! Does this camera come with the original warranty card and battery charger? I will pay via TrustBridge escrow.'
              )
            }
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium"
          >
            Benign Escrow Purchase
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !inputText.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Multi-Vectors...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Execute Unified AI Inspection
              </>
            )}
          </button>
          {inputText && (
            <button
              onClick={() => {
                setInputText('');
                setReport(null);
                setUrlReport(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Result Container */}
        {report && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiskBadge score={report.riskScore} category={report.riskCategory} size="lg" />
                <span className="font-extrabold text-sm text-slate-900">
                  {report.riskCategory === 'CRITICAL'
                    ? 'Critical Threat Detected'
                    : report.riskCategory === 'HIGH'
                    ? 'High Scam Probability'
                    : report.riskCategory === 'MEDIUM'
                    ? 'Suspicious Signal Identified'
                    : 'Verified Safe Communication'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">ID: {report.analysisId}</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-800 mb-1">Recommended Cybersecurity Action:</div>
              <p className="text-xs font-semibold text-blue-900">{report.recommendedAction}</p>
              <div className="text-xs font-bold text-slate-800 mt-2 mb-1">Explainable AI Forensic Rationale:</div>
              <p className="text-xs text-slate-600 leading-relaxed">{report.explanation}</p>
            </div>

            {/* URL Breakdown if available */}
            {urlReport && urlReport.analyzedUrls.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  URL Threat Intelligence Breakdown
                </span>
                {urlReport.analyzedUrls.map((au, idx) => (
                  <URLRiskIndicator key={idx} analyzedUrl={au} />
                ))}
              </div>
            )}

            <RiskDetails
              nlpScore={report.nlpScore}
              urlScore={report.urlScore}
              behaviouralScore={report.behaviouralScore}
              mlScore={report.mlScore}
              confidenceScore={report.confidenceScore}
              detectionEngine={report.detectionEngine}
              indicators={report.detectedIndicators}
              evidence={report.evidenceReferences}
              modelVersion={report.modelVersion}
            />
          </div>
        )}
      </div>
    </div>
  );
};
