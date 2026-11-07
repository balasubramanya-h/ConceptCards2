import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderTree, Users, Play, MoreVertical, GitFork, Trash2, Edit3, Lock, Globe } from 'lucide-react';

export default function DeckCard({
  deck,
  onStudy,
  onEdit,
  onDelete,
  onFork,
  showCommunityActions = false,
}) {
  const stats = deck.stats || {
    totalCards: 0,
    dueCards: 0,
    masteredCards: 0,
    learningCards: 0,
    newCards: 0,
  };

  const total = stats.totalCards || 0;
  const masteredPct = total > 0 ? Math.round(((stats.masteredCards || 0) / total) * 100) : 0;
  const learningPct = total > 0 ? Math.round(((stats.learningCards || 0) / total) * 100) : 0;
  const newPct = total > 0 ? Math.max(0, 100 - masteredPct - learningPct) : 0;

  const dueCount = stats.dueCards || 0;
  const subdecks = deck.subdeckCount || 0;
  const hasCollaborators = deck.collaborators && deck.collaborators.length > 0;

  return (
    <div className="group relative flex flex-col bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10">
      {/* Top Color Accent Line */}
      <div
        className="absolute top-0 left-6 right-6 h-1 rounded-b-full transition-all duration-300 group-hover:h-1.5"
        style={{ backgroundColor: deck.color || '#6366f1' }}
      />

      {/* Header: Title and Privacy/Collab Badges */}
      <div className="flex items-start justify-between gap-3 mb-2 pt-1">
        <Link
          to={`/deck/${deck._id}`}
          className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1"
        >
          {deck.title}
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          {deck.isPublic ? (
            <span title="Public deck" className="text-slate-400 hover:text-slate-200">
              <Globe className="w-4 h-4 text-emerald-400" />
            </span>
          ) : (
            <span title="Private deck" className="text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            </span>
          )}

          {hasCollaborators && (
            <span title={`${deck.collaborators.length} collaborator(s)`} className="text-indigo-400">
              <Users className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
        {deck.description || 'No description provided.'}
      </p>

      {/* Tags */}
      {deck.tags && deck.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {deck.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/40"
            >
              #{tag}
            </span>
          ))}
          {deck.tags.length > 3 && (
            <span className="text-[10px] text-slate-500 self-center">
              +{deck.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Progress Breakdown Bar */}
      <div className="mt-auto space-y-1.5 pt-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{total} card{total === 1 ? '' : 's'}</span>
          <span className="text-emerald-400 font-semibold">{masteredPct}% Mastered</span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden flex">
          <div
            style={{ width: `${masteredPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Mastered: ${stats.masteredCards || 0}`}
          />
          <div
            style={{ width: `${learningPct}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`Learning/Review: ${stats.learningCards || 0}`}
          />
          <div
            style={{ width: `${newPct}%` }}
            className="bg-sky-500 transition-all duration-500"
            title={`New: ${stats.newCards || 0}`}
          />
        </div>
      </div>

      {/* Subdecks & Due indicators */}
      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-700/40">
        <div className="flex items-center gap-2">
          {subdecks > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>{subdecks} subdeck{subdecks > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        <div>
          {dueCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {dueCount} due
            </span>
          ) : (
            <span className="text-xs text-slate-500">All caught up</span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 mt-4 pt-2">
        {showCommunityActions ? (
          <button
            type="button"
            onClick={() => onFork && onFork(deck)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition"
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            Fork to My Decks
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onStudy && onStudy(deck)}
              disabled={total === 0}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                total === 0
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : dueCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {dueCount > 0 ? `Study (${dueCount})` : 'Study'}
            </button>

            <Link
              to={`/deck/${deck._id}`}
              className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              title="View deck cards and settings"
            >
              Cards
            </Link>

            {deck.canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(deck)}
                className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                title="Edit Deck"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {deck.isOwner && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(deck)}
                className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                title="Delete Deck"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

