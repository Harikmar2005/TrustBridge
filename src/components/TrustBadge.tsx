import React from 'react';
import { Shield, ShieldAlert, Award, CheckCircle2, AlertCircle, FileCheck, Info } from 'lucide-react';
import { UserProfile, User } from '../types';

interface TrustBadgeProps {
  user: User;
  profile?: UserProfile | null;
  compact?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ user, profile, compact = false }) => {
  const trustScore = user.trustScore || 85;

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'PLATINUM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'GOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'STANDARD':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PROBATION':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTierColor(
            profile?.trustTier
          )}`}
        >
          <Shield className="w-3 h-3 stroke-[2.5]" />
          <span>{trustScore}/100</span>
          {profile?.trustTier && <span className="opacity-75 font-medium">&bull; {profile.trustTier}</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Evidence-Based Trust Reputation</h4>
            <p className="text-[11px] text-slate-500">Multidimensional marketplace integrity factors</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getTierColor(profile?.trustTier)}`}>
          {profile?.trustTier || 'STANDARD'} TIER
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-base font-extrabold text-slate-900">{trustScore}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase">Trust Score</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-base font-extrabold text-emerald-700">{profile?.completedOrders || 0}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase">Completed Txns</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-base font-extrabold text-blue-700">{profile?.disputeRate || '0%'}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase">Dispute Rate</p>
        </div>
      </div>

      {/* Verification Badges */}
      {profile?.verificationBadges && profile.verificationBadges.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            Verified Integrity Credentials:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.verificationBadges.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>
          Ratings reflect verified escrow settlements and auditable proof. Unverified reports do not impact score.
        </span>
      </div>
    </div>
  );
};
