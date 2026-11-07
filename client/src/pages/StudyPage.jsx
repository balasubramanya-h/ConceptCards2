import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { studyAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Layers,
  ArrowLeft,
  RotateCw,
  HelpCircle,
  Clock,
  Award,
  Zap,
  CheckCircle2,
  XCircle,
  Flame,
  Sparkles,
  Loader2,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export default function StudyPage() {
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  const isGlobalStudy = deckId === 'all';
  const mode = searchParams.get('mode') || 'due';
  const includeSubdecks = searchParams.get('includeSubdecks') === 'true';
  const limit = searchParams.get('limit') || '50';

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Session Statistics
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    startTime: Date.now(),
    endTime: null,
  });

  const cardStartTimeRef = useRef(Date.now());

  // Load cards for session
  const loadSessionCards = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isGlobalStudy) {
        res = await studyAPI.getDueAll({ limit });
      } else {
        res = await studyAPI.getDueCards(deckId, {
          mode,
          includeSubdecks: includeSubdecks ? 'true' : 'false',
          limit,
        });
      }

      if (res.data.success) {
        setCards(res.data.cards || []);
        setSessionStats((prev) => ({
          ...prev,
          total: (res.data.cards || []).length,
          startTime: Date.now(),
        }));
      }
    } catch (err) {
      console.error('Failed to load study cards:', err);
    } finally {
      setLoading(false);
      cardStartTimeRef.current = Date.now();
    }
  }, [deckId, isGlobalStudy, mode, includeSubdecks, limit]);

  useEffect(() => {
    loadSessionCards();
  }, [loadSessionCards]);

  // Current Card
  const currentCard = cards[currentIndex];

  // Submit SM-2 Review
  const handleRating = async (quality) => {
    if (!currentCard || submittingReview) return;

    try {
      setSubmittingReview(true);
      const responseTimeMs = Date.now() - cardStartTimeRef.current;

      await studyAPI.submitReview(currentCard._id, {
        quality,
        responseTimeMs,
      });

      // Update session statistics
      const isSuccess = quality >= 3;
      setSessionStats((prev) => ({
        ...prev,
        correct: isSuccess ? prev.correct + 1 : prev.correct,
        incorrect: !isSuccess ? prev.incorrect + 1 : prev.incorrect,
      }));

      // Next card or finish
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        setShowHint(false);
        cardStartTimeRef.current = Date.now();
      } else {
        // Study session completed!
        setSessionCompleted(true);
        refreshUser();
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere if an input is focused
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (sessionCompleted || loading || !currentCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHint((prev) => !prev);
      } else if (isFlipped && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const rating = parseInt(e.key);
        handleRating(rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, sessionCompleted, loading, currentCard, submittingReview]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Assembling your spaced-repetition queue...</p>
      </div>
    );
  }

  // Session Completed Screen
  if (sessionCompleted || cards.length === 0) {
    const totalStudied = sessionStats.correct + sessionStats.incorrect;
    const accuracy = totalStudied > 0 ? Math.round((sessionStats.correct / totalStudied) * 100) : 100;

    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {cards.length === 0 ? 'All Caught Up!' : 'Session Complete!'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {cards.length === 0
                ? 'No cards currently due for review under these criteria.'
                : 'Outstanding work. Your memory retention intervals have been recalculated.'}
            </p>
          </div>

          {totalStudied > 0 && (
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Studied</span>
                <span className="text-xl font-extrabold text-white">{totalStudied}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Accuracy</span>
                <span className="text-xl font-extrabold text-indigo-400">{accuracy}%</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Streak</span>
                <span className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  {user?.streak || 1}d
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            {!isGlobalStudy && (
              <Link
                to={`/deck/${deckId}`}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30"
              >
                Return to Deck
              </Link>
            )}
            <Link
              to="/dashboard"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const previews = currentCard.intervalPreviews || {};
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Progress Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Session</span>
        </button>

        <div className="flex-1 max-w-xs space-y-1 text-center">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="text-indigo-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentCard.hints && currentCard.hints.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition ${
                showHint
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
              title="Toggle Hint (Press 'H')"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Hint (H)</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Hint Banner */}
      {showHint && currentCard.hints && currentCard.hints.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 animate-in fade-in">
          <span className="font-bold">Hint: </span>
          <span>{currentCard.hints.join(' • ')}</span>
        </div>
      )}

      {/* 3D Flashcard Display */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="perspective-1000 cursor-pointer select-none group min-h-[380px]"
      >
        <div
          className={`relative min-h-[380px] w-full rounded-3xl p-8 border transition-all duration-500 preserve-3d shadow-2xl ${
            isFlipped
              ? 'rotate-y-180 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border-indigo-500/50 shadow-indigo-500/10'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border-slate-800 group-hover:border-slate-700'
          }`}
        >
          {/* Card Front */}
          <div
            className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden ${
              isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono uppercase font-bold text-indigo-400 tracking-wider">
                Question / Prompt
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                {currentCard.deck?.title || 'Deck Card'}
              </span>
            </div>

            <div className="my-auto py-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h2>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
              <span>Press Space or click anywhere to flip</span>
              <span className="text-indigo-400 flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform">
                Flip card <RotateCw className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card Back */}
          <div
            className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden rotate-y-180 ${
              isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono uppercase font-bold text-emerald-400 tracking-wider">
                Answer / Explanation
              </span>
              <span className="text-xs text-slate-500">
                Rate recall difficulty below (1-5)
              </span>
            </div>

            <div className="my-auto py-6">
              <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                {currentCard.back}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
              <span>Shortcuts: Keys 1 to 5</span>
              <span className="text-emerald-400 font-semibold">SM-2 Spaced Scheduling</span>
            </div>
          </div>
        </div>
      </div>

      {/* SM-2 Rating Controls (Shown when card is flipped) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>{isFlipped ? 'How well did you recall this concept?' : 'Flip card to unlock rating options'}</span>
          <span className="text-slate-500 font-mono">SM-2 Schedule</span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {/* Rating 1: Again / Blackout */}
          <button
            type="button"
            disabled={!isFlipped || submittingReview}
            onClick={() => handleRating(1)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              isFlipped
                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-300 hover:scale-[1.02]'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400 mb-0.5">1</span>
            <span className="font-bold text-xs sm:text-sm">Again</span>
            <span className="text-[10px] font-mono text-rose-400 font-semibold mt-1">
              {previews[1]?.label || '<1d'}
            </span>
          </button>

          {/* Rating 2: Hard */}
          <button
            type="button"
            disabled={!isFlipped || submittingReview}
            onClick={() => handleRating(2)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              isFlipped
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300 hover:scale-[1.02]'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400 mb-0.5">2</span>
            <span className="font-bold text-xs sm:text-sm">Hard</span>
            <span className="text-[10px] font-mono text-amber-400 font-semibold mt-1">
              {previews[2]?.label || '1d'}
            </span>
          </button>

          {/* Rating 3: Good */}
          <button
            type="button"
            disabled={!isFlipped || submittingReview}
            onClick={() => handleRating(3)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              isFlipped
                ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:scale-[1.02]'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400 mb-0.5">3</span>
            <span className="font-bold text-xs sm:text-sm">Good</span>
            <span className="text-[10px] font-mono text-indigo-400 font-semibold mt-1">
              {previews[3]?.label || '6d'}
            </span>
          </button>

          {/* Rating 4: Easy */}
          <button
            type="button"
            disabled={!isFlipped || submittingReview}
            onClick={() => handleRating(4)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              isFlipped
                ? 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/40 text-sky-300 hover:scale-[1.02]'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400 mb-0.5">4</span>
            <span className="font-bold text-xs sm:text-sm">Easy</span>
            <span className="text-[10px] font-mono text-sky-400 font-semibold mt-1">
              {previews[4]?.label || '14d'}
            </span>
          </button>

          {/* Rating 5: Perfect */}
          <button
            type="button"
            disabled={!isFlipped || submittingReview}
            onClick={() => handleRating(5)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              isFlipped
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:scale-[1.02]'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="font-mono text-[10px] text-slate-400 mb-0.5">5</span>
            <span className="font-bold text-xs sm:text-sm">Perfect</span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold mt-1">
              {previews[5]?.label || '21d'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

