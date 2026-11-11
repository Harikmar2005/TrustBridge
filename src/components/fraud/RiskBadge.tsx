import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';
import { RiskCategory } from '../../services/fraudEngine/types';

interface RiskBadgeProps {
  score: number;
  category: RiskCategory;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  category,
  showScore = true,
  size = 'md',
  onClick,
}) => {
  const getColors = () => {
    switch (category) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
    switch (category) {
      case 'CRITICAL':
        return <ShieldX className={iconSize} />;
      case 'HIGH':
        return <ShieldAlert className={iconSize} />;
      case 'MEDIUM':
        return <AlertTriangle className={iconSize} />;
      case 'LOW':
      default:
        return <ShieldCheck className={iconSize} />;
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1.5 text-xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border transition-all ${getColors()} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:shadow-xs' : ''
      }`}
    >
      {getIcon()}
      <span>{category}</span>
      {showScore && <span className="opacity-75 font-mono">({score}/100)</span>}
    </span>
  );
};
