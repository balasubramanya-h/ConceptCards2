import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { decksAPI, studyAPI } from '../utils/api';
import DeckCard from '../components/DeckCard';
import StudySessionModal from '../components/StudySessionModal';
import {
  Layers,
  Plus,
  Search,
  Flame,
  Award,
  Clock,
  Sparkles,
  BookOpen,
  Filter,
  Loader2,
  FolderTree,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#0ea5e9', // Sky
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
];

export default function DashboardPage({ openCreateModalProp, onCloseCreateModalProp }) {
  const { user, userStats, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'owned', 'collaborated'
  const [hierarchyMode, setHierarchyMode] = useState('root'); // 'root' or 'all'

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studyModalDeck, setStudyModalDeck] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    parentDeck: '',
    tags: '',
    color: '#6366f1',
    isPublic: false,
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Sync external open request from Navbar if passed
  useEffect(() => {
    if (openCreateModalProp) {
      setIsCreateModalOpen(true);
    }
  }, [openCreateModalProp]);

  // Fetch accessible decks
  const loadDecks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (hierarchyMode === 'root') {
        params.parentDeck = 'root';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await decksAPI.getAll(params);
      if (res.data.success) {
        setDecks(res.data.decks);
      }
    } catch (err) {
      console.error('Failed to load decks:', err);
    } finally {
      setLoading(false);
    }
  }, [hierarchyMode, searchQuery]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Filtered decks according to ownership filter
  const filteredDecks = decks.filter((d) => {
    if (activeFilter === 'owned') return d.isOwner;
    if (activeFilter === 'collaborated') return !d.isOwner;
    return true;
  });

  // Calculate totals from decks
  const totalCardsCount = decks.reduce((acc, d) => acc + (d.stats?.totalCards || 0), 0);
  const totalDueCount = decks.reduce((acc, d) => acc + (d.stats?.dueCards || 0), 0);
  const totalMasteredCount = decks.reduce((acc, d) => acc + (d.stats?.masteredCards || 0), 0);
  const masteryPercentage = totalCardsCount > 0 ? Math.round((totalMasteredCount / totalCardsCount) * 100) : 0;

  // Open Create Deck
  const handleOpenCreate = (parentDeckId = '') => {
    setFormData({
      title: '',
      description: '',
      parentDeck: parentDeckId || '',
      tags: '',
      color: '#6366f1',
      isPublic: false,
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Deck
  const handleOpenEdit = (deck) => {
    setSelectedDeck(deck);
    setFormData({
      title: deck.title,
      description: deck.description || '',
      parentDeck: deck.parentDeck || '',
      tags: deck.tags ? deck.tags.join(', ') : '',
      color: deck.color || '#6366f1',
      isPublic: Boolean(deck.isPublic),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Delete Deck
  const handleOpenDelete = (deck) => {
    setSelectedDeck(deck);
    setIsDeleteModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  // Submit Create Deck
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Deck title is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        parentDeck: formData.parentDeck || null,
        tags: tagsArray,
        color: formData.color,
        isPublic: formData.isPublic,
      };

      const res = await decksAPI.create(payload);
      if (res.data.success) {
        setIsCreateModalOpen(false);
        if (onCloseCreateModalProp) onCloseCreateModalProp();
        loadDecks();
        refreshUser();
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create deck');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Update Deck
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Deck title is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        parentDeck: formData.parentDeck || null,
        tags: tagsArray,
        color: formData.color,
        isPublic: formData.isPublic,
      };

      const res = await decksAPI.update(selectedDeck._id, payload);
      if (res.data.success) {
        setIsEditModalOpen(false);
        loadDecks();
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to update deck');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm Delete Deck
  const handleDeleteConfirm = async () => {
    if (!selectedDeck) return;
    try {
      setFormSubmitting(true);
      await decksAPI.delete(selectedDeck._id);
      setIsDeleteModalOpen(false);
      setSelectedDeck(null);
      loadDecks();
      refreshUser();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete deck');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner & Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Streak & Greeting */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/60 to-slate-900 border border-indigo-500/30 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Welcome Back</span>
            </div>
            <h1 className="text-xl font-extrabold text-white truncate">
              {user?.displayName || user?.username}
            </h1>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-indigo-800/40">
            <span className="text-xs text-slate-400">Current Streak</span>
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-sm">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{user?.streak || 0} days</span>
            </div>
          </div>
        </div>

        {/* Due Cards Quick Review */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due Today</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-white">{totalDueCount}</span>
            <span className="text-xs text-slate-400 ml-1.5">cards to review</span>
          </div>
          {totalDueCount > 0 ? (
            <Link
              to="/study/all"
              className="w-full text-center py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Review All Due Now
            </Link>
          ) : (
            <span className="text-xs text-emerald-400 font-medium">All caught up for today!</span>
          )}
        </div>

        {/* Total Cards in Vault */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cards</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-white">{totalCardsCount}</span>
            <span className="text-xs text-slate-400 ml-1.5">across {decks.length} deck(s)</span>
          </div>
          <div className="text-xs text-slate-400">
            Target: <span className="font-semibold text-slate-200">{user?.dailyReviewTarget || 20} reviews/day</span>
          </div>
        </div>

        {/* Mastered Percentage */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mastery Level</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-400">{masteryPercentage}%</span>
            <span className="text-xs text-slate-400 ml-1.5">long-term retained</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${masteryPercentage}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Hierarchy Toggle, & Create Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decks by title or keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
          </div>

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Decks
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('owned')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeFilter === 'owned'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Created by Me
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('collaborated')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeFilter === 'collaborated'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shared with Me
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Hierarchy Mode Toggle */}
          <button
            type="button"
            onClick={() => setHierarchyMode(hierarchyMode === 'root' ? 'all' : 'root')}
            title="Toggle between root categories and flat deck view"
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition ${
              hierarchyMode === 'root'
                ? 'bg-slate-900 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>{hierarchyMode === 'root' ? 'Root Categories' : 'All Flat Decks'}</span>
          </button>

          {/* Create Deck Button */}
          <button
            type="button"
            onClick={() => handleOpenCreate('')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Deck</span>
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Loading your decks & spaced schedule...</p>
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="py-20 px-4 text-center rounded-3xl bg-slate-900/50 border border-slate-800 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No flashcard decks found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? `No decks matching "${searchQuery}". Try clearing search filters.`
              : 'Start your spaced repetition journey by creating your first hierarchical deck.'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenCreate('')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Deck</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck._id}
              deck={deck}
              onStudy={(d) => setStudyModalDeck(d)}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Study Session Configuration Modal */}
      <StudySessionModal
        isOpen={!!studyModalDeck}
        onClose={() => setStudyModalDeck(null)}
        deck={studyModalDeck}
      />

      {/* Create Deck Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                if (onCloseCreateModalProp) onCloseCreateModalProp();
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Create Flashcard Deck</h2>
            <p className="text-xs text-slate-400 mb-5">
              Organize cards individually or nest within a hierarchical category
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Deck Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Distributed Systems, Organic Chemistry"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe the topics covered in this deck..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Hierarchical Parent Deck Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Parent Deck (Hierarchical Nesting)
                </label>
                <select
                  value={formData.parentDeck}
                  onChange={(e) => setFormData({ ...formData, parentDeck: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">None (Root Level Deck)</option>
                  {decks
                    .filter((d) => d.isOwner || d.canEdit)
                    .map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Choosing a parent creates a nested subdeck structure.
                </p>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Deck Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {formData.color === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. computer-science, algorithms, exam-prep"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Public toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-white">Community Public Deck</p>
                  <p className="text-[11px] text-slate-400">Allow other learners to discover and fork this deck</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Deck</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deck Modal */}
      {isEditModalOpen && selectedDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Edit Deck Settings</h2>
            <p className="text-xs text-slate-400 mb-5">Update title, tags, color, or hierarchical parent</p>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Deck Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Deck Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {formData.color === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-white">Community Public Deck</p>
                  <p className="text-[11px] text-slate-400">Publicly discoverable by other learners</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Delete Deck: {selectedDeck.title}?</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              This action will permanently delete <strong className="text-white">{selectedDeck.title}</strong>, all of its nested child subdecks, and all contained flashcards. This cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Keep Deck
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={formSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

