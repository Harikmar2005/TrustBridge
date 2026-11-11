import React from 'react';
import { AnalyzedUrlDetail } from '../../types';
import { ExternalLink, ShieldAlert, ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';

interface URLRiskIndicatorProps {
  analyzedUrl: AnalyzedUrlDetail;
}

export const URLRiskIndicator: React.FC<URLRiskIndicatorProps> = ({ analyzedUrl }) => {
  const getBadge = () => {
    switch (analyzedUrl.reputationStatus) {
      case 'BLOCKED_SSRF':
        return {
          bg: 'bg-red-100 text-red-900 border-red-300',
          icon: <ShieldX className="w-3.5 h-3.5 text-red-700" />,
          label: 'SSRF BLOCKED (Internal IP)',
        };
      case 'MALICIOUS':
        return {
          bg: 'bg-red-100 text-red-900 border-red-300',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-700" />,
          label: 'KNOWN PHISHING / DECEPTIVE',
        };
      case 'SUSPICIOUS':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />,
          label: analyzedUrl.isShortener ? 'URL SHORTENER' : 'HIGH-RISK TLD / IP',
        };
      case 'SAFE':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'STANDARD DOMAIN',
        };
    }
  };

  const badge = getBadge();

  return (
    <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 ${badge.bg}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
          {badge.icon}
          {badge.label}
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {analyzedUrl.isSecureProtocol ? 'HTTPS' : 'INSECURE HTTP'}
        </span>
      </div>

      <div className="font-mono text-[11px] truncate bg-white/80 p-1 rounded border border-black/5">
        {analyzedUrl.url}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
        <span>Domain: <strong className="font-mono">{analyzedUrl.domain}</strong></span>
        {analyzedUrl.isIpHost && <span className="text-red-700 font-bold">• Numeric IP Host</span>}
        {analyzedUrl.isDeceptiveDomain && <span className="text-red-700 font-bold">• Deceptive Spoof</span>}
        {analyzedUrl.hasSuspiciousParams && <span className="text-amber-800 font-bold">• Credential Query Params</span>}
      </div>
    </div>
  );
};
