import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { decksAPI, cardsAPI, studyAPI } from '../utils/api';
import MasteryBadge from '../components/MasteryBadge';
import DuplicateWarningBadge from '../components/DuplicateWarningBadge';
import StudySessionModal from '../components/StudySessionModal';
import DeckAnalyticsModal from '../components/DeckAnalyticsModal';
import {
  Layers,
  ChevronRight,
  Plus,
  Play,
  Search,
  Users,
  Share2,
  FolderTree,
  Upload,
  Download,
  BarChart2,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  HelpCircle,
  AlertCircle,
  X,
  Loader2,
  CheckCircle,
  Calendar,
  Lock,
  Globe,
  Tag,
} from 'lucide-react';

export default function DeckDetailsPage() {
  const { id: deckId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);

  // Filters & Search
  const [cardSearch, setCardSearch] = useState('');
  const [masteryFilter, setMasteryFilter] = useState('');
  const [includeSubdecks, setIncludeSubdecks] = useState(false);

  // Modals
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Export cards as JSON or CSV
  const handleExport = (format = 'json') => {
    if (!cards || cards.length === 0) {
      alert('No cards available to export.');
      return;
    }

    let content, mime, filename;
    const sanitizedTitle = (deck?.title || 'deck').toLowerCase().replace(/[^\w-]/g, '_');

    if (format === 'json') {
      const exportData = cards.map((c) => ({
        front: c.front,
        back: c.back,
        hints: c.hints || [],
        tags: c.tags || [],
      }));
      content = JSON.stringify(exportData, null, 2);
      mime = 'application/json';
      filename = `${sanitizedTitle}-cards.json`;
    } else {
      const rows = [
        ['Front', 'Back', 'Hints', 'Tags'],
        ...cards.map((c) => [
          `"${(c.front || '').replace(/"/g, '""')}"`,
          `"${(c.back || '').replace(/"/g, '""')}"`,
          `"${(c.hints || []).join('; ').replace(/"/g, '""')}"`,
          `"${(c.tags || []).join('; ').replace(/"/g, '""')}"`,
        ]),
      ];
      content = rows.map((r) => r.join(',')).join('\n');
      mime = 'text/csv';
      filename = `${sanitizedTitle}-cards.csv`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Card Form State
  const [cardForm, setCardForm] = useState({
    front: '',
    back: '',
    hints: '',
    tags: '',
  });
  const [cardFormError, setCardFormError] = useState('');
  const [cardSubmitting, setCardSubmitting] = useState(false);

  // Real-time Duplicate Detection State
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const duplicateTimeoutRef = useRef(null);

  // Collaborator Form State
  const [collabIdentifier, setCollabIdentifier] = useState('');
  const [collabRole, setCollabRole] = useState('editor');
  const [collabMessage, setCollabMessage] = useState({ text: '', type: '' });
  const [collabSubmitting, setCollabSubmitting] = useState(false);

  // Batch Import Form State
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importSubmitting, setImportSubmitting] = useState(false);

  // Load Deck Metadata & Breadcrumbs
  const loadDeckDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [deckRes, breadcrumbsRes] = await Promise.all([
        decksAPI.getOne(deckId),
        decksAPI.getBreadcrumbs(deckId),
      ]);

      if (deckRes.data.success) {
        setDeck(deckRes.data.deck);
      }
      if (breadcrumbsRes.data.success) {
        setBreadcrumbs(breadcrumbsRes.data.breadcrumbs);
      }
    } catch (err) {
      console.error('Failed to load deck:', err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  // Load Deck Cards
  const loadCards = useCallback(async () => {
    try {
      setCardsLoading(true);
      const params = {
        includeSubdecks: includeSubdecks ? 'true' : 'false',
        sort: 'nextReviewDate',
        order: 'asc',
      };
      if (cardSearch.trim()) params.search = cardSearch.trim();
      if (masteryFilter) params.masteryLevel = masteryFilter;

      const res = await cardsAPI.getDeckCards(deckId, params);
      if (res.data.success) {
        setCards(res.data.cards);
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setCardsLoading(false);
    }
  }, [deckId, includeSubdecks, cardSearch, masteryFilter]);

  useEffect(() => {
    loadDeckDetails();
  }, [loadDeckDetails]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Real-time duplicate check with debounce
  const triggerDuplicateCheck = (front, back) => {
    if (duplicateTimeoutRef.current) {
      clearTimeout(duplicateTimeoutRef.current);
    }

    if (!front || front.trim().length < 3) {
      setDuplicateResult(null);
      setIsCheckingDuplicate(false);
      return;
    }

    setIsCheckingDuplicate(true);
    duplicateTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await cardsAPI.checkDuplicate({
          deckId,
          front: front.trim(),
          back: back ? back.trim() : '',
          excludeCardId: editingCard ? editingCard._id : undefined,
          checkSubdecks: true,
        });

        if (res.data.success) {
          setDuplicateResult(res.data);
        }
      } catch (err) {
        console.warn('Duplicate check warning:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 280);
  };

  const handleFrontChange = (e) => {
    const val = e.target.value;
    setCardForm((prev) => ({ ...prev, front: val }));
    triggerDuplicateCheck(val, cardForm.back);
  };

  const handleBackChange = (e) => {
    const val = e.target.value;
    setCardForm((prev) => ({ ...prev, back: val }));
    triggerDuplicateCheck(cardForm.front, val);
  };

  // Open Card Modal (New)
  const handleOpenAddCard = () => {
    setEditingCard(null);
    setCardForm({ front: '', back: '', hints: '', tags: '' });
    setDuplicateResult(null);
    setCardFormError('');
    setIsCardModalOpen(true);
  };

  // Open Card Modal (Edit)
  const handleOpenEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      front: card.front,
      back: card.back,
      hints: card.hints ? card.hints.join(', ') : '',
      tags: card.tags ? card.tags.join(', ') : '',
    });
    setDuplicateResult(null);
    setCardFormError('');
    setIsCardModalOpen(true);
  };

  // Save Card (Add or Edit)
  const handleSaveCard = async (forceSave = false) => {
    if (!cardForm.front.trim()) {
      setCardFormError('Card front (question/prompt) is required');
      return;
    }
    if (!cardForm.back.trim()) {
      setCardFormError('Card back (answer/solution) is required');
      return;
    }

    try {
      setCardSubmitting(true);
      setCardFormError('');

      const hintsArray = cardForm.hints
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
      const tagsArray = cardForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        deckId,
        front: cardForm.front.trim(),
        back: cardForm.back.trim(),
        hints: hintsArray,
        tags: tagsArray,
        forceSave,
      };

      if (editingCard) {
        await cardsAPI.update(editingCard._id, payload);
      } else {
        await cardsAPI.create(payload);
      }

      setIsCardModalOpen(false);
      loadCards();
      loadDeckDetails();
    } catch (err) {
      if (err.response?.status === 409) {
        // High duplicate match detected
        setDuplicateResult(err.response.data);
        setCardFormError(err.response.data.message || 'Duplicate card warning.');
      } else {
        setCardFormError(err.response?.data?.message || 'Failed to save card');
      }
    } finally {
      setCardSubmitting(false);
    }
  };

  // Delete Card
  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;
    try {
      await cardsAPI.delete(cardId);
      loadCards();
      loadDeckDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete card');
    }
  };

  // Collaborator invite handler
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collabIdentifier.trim()) return;

    try {
      setCollabSubmitting(true);
      setCollabMessage({ text: '', type: '' });
      const res = await decksAPI.addCollaborator(deckId, {
        identifier: collabIdentifier.trim(),
        role: collabRole,
      });

      if (res.data.success) {
        setCollabMessage({ text: res.data.message, type: 'success' });
        setCollabIdentifier('');
        loadDeckDetails();
      }
    } catch (err) {
      setCollabMessage({
        text: err.response?.data?.message || 'Failed to add collaborator',
        type: 'error',
      });
    } finally {
      setCollabSubmitting(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (collabUserId) => {
    try {
      await decksAPI.removeCollaborator(deckId, collabUserId);
      loadDeckDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove collaborator');
    }
  };

  // Batch import cards
  const handleBatchImport = async (e) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      setImportSubmitting(true);
      setImportResult(null);

      let parsed = [];
      // Attempt JSON parse
      try {
        parsed = JSON.parse(importText);
      } catch {
        // Attempt CSV parse (Front,Back,Hints)
        const lines = importText.split('\n').filter((l) => l.trim().length > 0);
        parsed = lines.map((line) => {
          const parts = line.split(',');
          return {
            front: parts[0]?.trim(),
            back: parts[1]?.trim() || '',
            hints: parts[2] ? [parts[2].trim()] : [],
          };
        });
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert('Invalid card data format. Provide JSON array or CSV lines.');
        setImportSubmitting(false);
        return;
      }

      const res = await cardsAPI.batchImport({
        deckId,
        cards: parsed,
        skipDuplicates: true,
      });

      if (res.data.success) {
        setImportResult(res.data);
        loadCards();
        loadDeckDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import cards');
    } finally {
      setImportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Loading deck tree and flashcards...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Deck not found</h2>
        <p className="text-xs text-slate-400 mb-6">
          This deck might have been deleted or you do not have permission to access it.
        </p>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-xs font-bold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const dueCount = deck.stats?.dueCards || 0;
  const totalCount = deck.stats?.totalCards || 0;
  const isOwner = deck.isOwner;
  const canEdit = deck.canEdit;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link to="/dashboard" className="hover:text-indigo-400 transition">
          Vault
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb._id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-slate-100 font-bold">{crumb.title}</span>
            ) : (
              <Link to={`/deck/${crumb._id}`} className="hover:text-indigo-400 transition">
                {crumb.title}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Deck Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        {/* Accent Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: deck.color || '#6366f1' }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: deck.color || '#6366f1' }}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {deck.parentDeck ? 'Subdeck' : 'Root Deck'}
              </span>
              {deck.isPublic ? (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{deck.title}</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {deck.description || 'No description provided for this flashcard deck.'}
            </p>

            {/* Tags & Owner */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>Created by</span>
                <span className="text-slate-200 font-semibold">
                  @{deck.owner?.username || 'user'}
                </span>
              </div>

              {deck.tags && deck.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {deck.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap md:flex-col items-center md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsStudyModalOpen(true)}
              disabled={totalCount === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Study Session {dueCount > 0 ? `(${dueCount} Due)` : ''}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnalyticsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="View Deck Retention Analytics"
              >
                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Analytics</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsCollabModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Manage Deck Collaborators"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Collaborators ({deck.collaborators?.length || 0})</span>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Batch Import Cards"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Import</span>
                </button>
              )}

              {totalCount > 0 && (
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl border border-slate-700 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    title="Export as JSON"
                  >
                    JSON
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    title="Export as CSV"
                  >
                    CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deck Spaced Repetition Stats Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Total Cards</span>
            <span className="text-2xl font-extrabold text-white">{totalCount}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Due for Review</span>
            <span className="text-2xl font-extrabold text-rose-400">{dueCount}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Mastered</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {deck.stats?.masteredCards || 0}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Learning & Review</span>
            <span className="text-2xl font-extrabold text-indigo-400">
              {deck.stats?.learningCards || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Subdecks Section (Hierarchical Nesting) */}
      {deck.subdecks && deck.subdecks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Child Subdecks ({deck.subdecks.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {deck.subdecks.map((sub) => (
              <Link
                key={sub._id}
                to={`/deck/${sub._id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: sub.color || '#6366f1' }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {sub.stats?.totalCards || 0} cards • {sub.stats?.dueCards || 0} due
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cards Explorer & Management Section */}
      <div className="space-y-4">
        {/* Search, Filters, and New Card Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                placeholder="Search flashcards in this deck..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mastery Filter */}
            <select
              value={masteryFilter}
              onChange={(e) => setMasteryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Mastery Levels</option>
              <option value="New">New</option>
              <option value="Learning">Learning</option>
              <option value="Review">Review</option>
              <option value="Mastered">Mastered</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {deck.subdecks && deck.subdecks.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubdecks}
                  onChange={(e) => setIncludeSubdecks(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <span>Include Subdecks</span>
              </label>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleOpenAddCard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Card</span>
              </button>
            )}
          </div>
        </div>

        {/* Cards List */}
        {cardsLoading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
            <p className="text-xs">Loading flashcards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800 max-w-md mx-auto">
            <p className="text-sm font-semibold text-white mb-1">No flashcards found</p>
            <p className="text-xs text-slate-400 mb-4">
              {cardSearch ? 'No cards match your search criteria.' : 'This deck does not contain any flashcards yet.'}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenAddCard}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Create First Card
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {cards.map((card) => {
              const isDue = new Date(card.nextReviewDate) <= new Date();

              return (
                <div
                  key={card._id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Front Prompt */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-bold shrink-0 mt-0.5">
                        Q
                      </span>
                      <p className="text-sm font-bold text-white leading-relaxed">
                        {card.front}
                      </p>
                    </div>

                    {/* Back Answer */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold shrink-0 mt-0.5">
                        A
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        {card.back}
                      </p>
                    </div>

                    {/* Hints & Tags */}
                    {(card.hints?.length > 0 || card.tags?.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {card.hints?.map((hint, hIdx) => (
                          <span
                            key={hIdx}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-amber-300 border border-amber-500/20"
                          >
                            <HelpCircle className="w-3 h-3" />
                            Hint: {hint}
                          </span>
                        ))}
                        {card.tags?.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SM-2 Metadata and Actions */}
                  <div className="flex items-center md:flex-col items-end gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="flex items-center gap-2">
                      <MasteryBadge
                        level={card.masteryLevel}
                        interval={card.interval}
                        repetition={card.repetition}
                      />
                      {isDue ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          Due
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Review in {card.interval}d
                        </span>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCard(card)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                          title="Edit Card"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card._id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Flashcard Modal with LIVE DUPLICATE DETECTION */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              {editingCard ? 'Edit Flashcard' : 'Add Flashcard'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Real-time duplicate detection protects deck purity
            </p>

            {cardFormError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{cardFormError}</span>
              </div>
            )}

            {/* LIVE DUPLICATE WARNING BADGE */}
            <div className="mb-4">
              <DuplicateWarningBadge
                duplicateResult={duplicateResult}
                isLoading={isCheckingDuplicate}
                onOverride={() => handleSaveCard(true)}
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCard(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Card Front (Question / Prompt) *
                </label>
                <textarea
                  value={cardForm.front}
                  onChange={handleFrontChange}
                  placeholder="e.g. What is the CAP theorem in distributed databases?"
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Card Back (Answer / Solution) *
                </label>
                <textarea
                  value={cardForm.back}
                  onChange={handleBackChange}
                  placeholder="e.g. It states that a distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance."
                  rows={4}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Hints (Comma-separated)
                </label>
                <input
                  type="text"
                  value={cardForm.hints}
                  onChange={(e) => setCardForm({ ...cardForm, hints: e.target.value })}
                  placeholder="e.g. Think of Eric Brewer's 2000 keynote"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={cardForm.tags}
                  onChange={(e) => setCardForm({ ...cardForm, tags: e.target.value })}
                  placeholder="e.g. distributed-systems, databases"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cardSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {cardSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCard ? 'Update Card' : 'Save Flashcard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborator Modal */}
      {isCollabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCollabModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Deck Collaborators</h2>
            <p className="text-xs text-slate-400 mb-5">
              Invite teammates to edit or review flashcards collaboratively
            </p>

            {collabMessage.text && (
              <div
                className={`mb-4 p-3 rounded-2xl flex items-start gap-2 text-xs ${
                  collabMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {collabMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{collabMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAddCollaborator} className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Collaborator Email or Username
                </label>
                <input
                  type="text"
                  value={collabIdentifier}
                  onChange={(e) => setCollabIdentifier(e.target.value)}
                  placeholder="e.g. colleague@university.edu"
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Access Role
                </label>
                <select
                  value={collabRole}
                  onChange={(e) => setCollabRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="editor">Editor (Can add, edit, and delete cards)</option>
                  <option value="viewer">Viewer (Can study and inspect cards)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={collabSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {collabSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Invite Collaborator</span>
              </button>
            </form>

            {/* Existing Collaborators List */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Active Collaborators
              </h3>
              {deck.collaborators && deck.collaborators.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deck.collaborators.map((c) => (
                    <div
                      key={c.user?._id || c._id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {c.user?.displayName || c.user?.username}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {c.user?.email} • <span className="capitalize">{c.role}</span>
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(c.user?._id)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No external collaborators yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Batch Import Flashcards</h2>
            <p className="text-xs text-slate-400 mb-4">
              Paste JSON array or CSV lines. Duplicate screening runs automatically.
            </p>

            {importResult && (
              <div className="mb-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 space-y-1">
                <p className="font-bold">{importResult.message}</p>
                <p>Imported: {importResult.importedCount} | Duplicates Skipped: {importResult.skippedCount}</p>
              </div>
            )}

            <form onSubmit={handleBatchImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Card Data (JSON or CSV: Question, Answer, Hint)
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Example JSON:
[
  { "front": "What is ACID?", "back": "Atomicity, Consistency, Isolation, Durability" }
]

Or CSV (one per line):
What is DNS?,Domain Name System,Translates IPs`}
                  rows={8}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {importSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Run Batch Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Study Session Configuration Modal */}
      <StudySessionModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        deck={deck}
      />

      {/* Deck Analytics & Retention Modal */}
      <DeckAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        deckId={deck?._id}
        deckTitle={deck?.title}
      />
    </div>
  );
}

