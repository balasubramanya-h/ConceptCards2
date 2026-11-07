import React from 'react';
import { Award, Zap, Clock, Sparkles } from 'lucide-react';

const config = {
  New: {
    bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    icon: Sparkles,
    label: 'New',
  },
  Learning: {
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: Zap,
    label: 'Learning',
  },
  Review: {
    bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    icon: Clock,
    label: 'Review',
  },
  Mastered: {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: Award,
    label: 'Mastered',
  },
};

export default function MasteryBadge({ level = 'New', interval, repetition, size = 'sm' }) {
  const meta = config[level] || config.New;
  const Icon = meta.icon;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${meta.bg} ${sizeClasses}`}
      title={`Repetition: ${repetition || 0} | Interval: ${interval || 0} days`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{meta.label}</span>
      {typeof interval === 'number' && interval > 0 && (
        <span className="opacity-75 text-[10px] ml-0.5 font-mono">({interval}d)</span>
      )}
    </span>
  );
}

