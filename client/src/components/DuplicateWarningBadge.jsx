import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';

export default function DuplicateWarningBadge({
  duplicateResult,
  isLoading = false,
  onOverride,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5 px-3 rounded-lg bg-slate-800/60 border border-slate-700/50 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        <span>Scanning deck for duplicates...</span>
      </div>
    );
  }

  if (!duplicateResult || !duplicateResult.hasDuplicate) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Unique card prompt — no duplicates detected</span>
      </div>
    );
  }

  const { highestScore, severity, matches } = duplicateResult;
  const isHigh = severity === 'high' || highestScore >= 80;

  const colorConfig = isHigh
    ? {
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        badge: 'bg-rose-500 text-white',
        icon: AlertCircle,
        title: 'High duplicate risk detected',
      }
    : {
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        badge: 'bg-amber-500 text-slate-900',
        icon: AlertTriangle,
        title: 'Potential similar card detected',
      };

  const Icon = colorConfig.icon;

  return (
    <div className={`rounded-xl border ${colorConfig.border} ${colorConfig.bg} p-3.5 transition-all text-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className={`w-5 h-5 ${colorConfig.text} shrink-0 mt-0.5`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${colorConfig.text}`}>{colorConfig.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${colorConfig.badge}`}>
                {highestScore}% match
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isHigh
                ? 'An existing card in this deck shares nearly identical prompt or answer semantics.'
                : 'Another card in this deck covers very similar conceptual ground.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60"
        >
          <span>{matches.length} match{matches.length > 1 ? 'es' : ''}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && matches && matches.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-700/60 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Matching Existing Cards
          </p>
          {matches.map((match, idx) => (
            <div
              key={match.cardId || idx}
              className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-300">Existing Front:</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                  {match.similarity}% similarity
                </span>
              </div>
              <p className="text-slate-200 font-mono line-clamp-2 bg-slate-950/60 p-1.5 rounded">
                {match.front}
              </p>

              {match.back && (
                <>
                  <span className="block font-semibold text-slate-400 mt-1">Existing Back:</span>
                  <p className="text-slate-300 line-clamp-2 bg-slate-950/60 p-1.5 rounded">
                    {match.back}
                  </p>
                </>
              )}
            </div>
          ))}

          {onOverride && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onOverride}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition font-medium"
              >
                Force Save (Ignore Duplicate)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

