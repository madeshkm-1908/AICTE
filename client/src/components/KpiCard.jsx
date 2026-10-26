import React from 'react';

export default function KpiCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  badge,
  badgeType = 'neutral',
  isOverdue = false,
  iconGradient = 'from-slate-100 to-slate-200',
  iconColor = 'text-slate-700',
  onClick 
}) {
  const badgeStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    process: 'bg-blue-50 text-blue-700 border-blue-200',
    disposed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    escalated: 'bg-red-50 text-red-700 border-red-200',
    overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-card-border rounded-card p-4 shadow-card hover:shadow-card-hover transition-smooth flex flex-col justify-between ${
        isOverdue ? 'border-l-4 border-l-red-500' : ''
      } ${onClick ? 'cursor-pointer hover:border-slate-300' : ''}`}
    >
      {/* Top: Icon + Label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          {Icon && (
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center shrink-0 shadow-2xs`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
          )}
          <span className="text-xs font-medium text-body truncate">
            {title}
          </span>
        </div>

        {badge && (
          <span className={`text-3xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyles[badgeType] || badgeStyles.neutral}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Middle: Big Metric */}
      <div className="mt-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-heading tabular-nums tracking-tight">
          {value !== undefined && value !== null ? value.toLocaleString() : '—'}
        </div>
      </div>

      {/* Bottom: Sub-line text */}
      {subtext && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-2xs text-muted flex items-center justify-between">
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
}
