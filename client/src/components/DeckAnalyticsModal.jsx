import React, { useState, useEffect } from 'react';
import { studyAPI } from '../utils/api';
import { X, TrendingUp, Award, Clock, BarChart2, CheckCircle2, Loader2 } from 'lucide-react';

export default function DeckAnalyticsModal({ isOpen, onClose, deckId, deckTitle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !deckId) return;

    let mounted = true;
    setLoading(true);

    studyAPI
      .getDeckAnalytics(deckId)
      .then((res) => {
        if (mounted && res.data.success) {
          setData(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load deck analytics:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, deckId]);

  if (!isOpen) return null;

  const dist = data?.masteryDistribution || { New: 0, Learning: 0, Review: 0, Mastered: 0 };
  const total = data?.totalCards || 0;
  const retention = data?.retentionRate ?? 100;
  const recent = data?.recentActivity || [];

  // Calculate highest count for bar chart scaling
  const maxActivity = Math.max(1, ...recent.map((r) => r.count));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Deck Analytics & Retention</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6 truncate">{deckTitle}</p>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs">Computing retention metrics & review logs...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Retention Rate</span>
                <span
                  className={`text-2xl font-extrabold ${
                    retention >= 80 ? 'text-emerald-400' : retention >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {retention}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">accuracy $\ge$ 3</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Reviews Logged</span>
                <span className="text-2xl font-extrabold text-white">
                  {data?.totalReviewsLogged || 0}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">all-time trials</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Total Cards</span>
                <span className="text-2xl font-extrabold text-indigo-400">{total}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">in this deck</span>
              </div>
            </div>

            {/* Mastery Level Distribution Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mastery Distribution
              </h3>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-semibold">Mastered</span>
                    <span className="text-slate-300 font-mono">
                      {dist.Mastered} ({total > 0 ? Math.round((dist.Mastered / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${total > 0 ? (dist.Mastered / total) * 100 : 0}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-indigo-400 font-semibold">Review</span>
                    <span className="text-slate-300 font-mono">
                      {dist.Review} ({total > 0 ? Math.round((dist.Review / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${total > 0 ? (dist.Review / total) * 100 : 0}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 font-semibold">Learning</span>
                    <span className="text-slate-300 font-mono">
                      {dist.Learning} ({total > 0 ? Math.round((dist.Learning / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${total > 0 ? (dist.Learning / total) * 100 : 0}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-sky-400 font-semibold">New</span>
                    <span className="text-slate-300 font-mono">
                      {dist.New} ({total > 0 ? Math.round((dist.New / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${total > 0 ? (dist.New / total) * 100 : 0}%` }}
                      className="h-full bg-sky-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 14-Day Activity Bar Chart */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  14-Day Study Activity
                </h3>
                <span className="text-[10px] text-slate-500">Reviews / day</span>
              </div>

              <div className="flex items-end justify-between gap-1.5 h-28 pt-4">
                {recent.map((day, idx) => {
                  const heightPercent = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
                  const label = day.date.slice(8); // 'DD'

                  return (
                    <div
                      key={day.date || idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-7 hidden group-hover:flex px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-200 border border-slate-700 whitespace-nowrap z-10 shadow-lg">
                        {day.date}: {day.count} review{day.count === 1 ? '' : 's'} ({day.successful} passed)
                      </div>

                      <div className="w-full bg-slate-800/80 rounded-t-sm flex items-end overflow-hidden h-full">
                        <div
                          style={{ height: `${Math.max(6, heightPercent)}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            day.count > 0 ? 'bg-indigo-500 group-hover:bg-indigo-400' : 'bg-transparent'
                          }`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

