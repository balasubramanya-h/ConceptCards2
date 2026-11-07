import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Zap, Clock, FolderTree, BookOpen } from 'lucide-react';

export default function StudySessionModal({ isOpen, onClose, deck }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('due'); // 'due' or 'cram'
  const [includeSubdecks, setIncludeSubdecks] = useState(true);
  const [limit, setLimit] = useState(20);

  if (!isOpen || !deck) return null;

  const dueCount = deck.stats?.dueCards || 0;
  const totalCount = deck.stats?.totalCards || 0;
  const hasSubdecks = (deck.subdeckCount || 0) > 0;

  const handleStart = () => {
    const params = new URLSearchParams({
      mode,
      includeSubdecks: includeSubdecks ? 'true' : 'false',
      limit: limit.toString(),
    });

    onClose();
    navigate(`/study/${deck._id}?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-4 h-8 rounded-full"
            style={{ backgroundColor: deck.color || '#6366f1' }}
          />
          <div>
            <h2 className="text-xl font-bold text-white line-clamp-1">{deck.title}</h2>
            <p className="text-xs text-slate-400">Configure your spaced-repetition session</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Study Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('due')}
              className={`flex flex-col items-start p-3.5 rounded-2xl border transition text-left ${
                mode === 'due'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className={`w-4 h-4 ${mode === 'due' ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="font-bold text-sm">Spaced (Due)</span>
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                Review {dueCount} card{dueCount === 1 ? '' : 's'} scheduled for today
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('cram')}
              className={`flex flex-col items-start p-3.5 rounded-2xl border transition text-left ${
                mode === 'cram'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className={`w-4 h-4 ${mode === 'cram' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="font-bold text-sm">Cram All</span>
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                Review all {totalCount} cards regardless of due date
              </span>
            </button>
          </div>
        </div>

        {/* Hierarchical Subdecks Toggle */}
        {hasSubdecks && (
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-white">Include Child Subdecks</p>
                <p className="text-xs text-slate-400">
                  Gather cards from {deck.subdeckCount} nested subdeck{deck.subdeckCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeSubdecks}
              onChange={(e) => setIncludeSubdecks(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Card Limit Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Session Card Limit
            </label>
            <span className="text-xs font-bold text-indigo-400">{limit} cards</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setLimit(count)}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  limit === count
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={mode === 'due' && dueCount === 0 && !hasSubdecks}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

