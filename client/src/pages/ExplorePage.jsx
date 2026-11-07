import React, { useState, useEffect, useCallback } from 'react';
import { decksAPI } from '../utils/api';
import DeckCard from '../components/DeckCard';
import { Search, Globe, GitFork, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExplorePage() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [forkSuccess, setForkSuccess] = useState('');
  const navigate = useNavigate();

  const loadPublicDecks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await decksAPI.getPublic(params);
      if (res.data.success) {
        setDecks(res.data.decks);
      }
    } catch (err) {
      console.error('Failed to load public decks:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadPublicDecks();
  }, [loadPublicDecks]);

  const handleFork = async (deck) => {
    try {
      const res = await decksAPI.fork(deck._id);
      if (res.data.success) {
        setForkSuccess(`Forked "${deck.title}" successfully into your library!`);
        setTimeout(() => {
          navigate(`/deck/${res.data.deck._id}`);
        }, 1200);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fork deck. Please log in.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5" />
          <span>Community Decks</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Explore Public Knowledge</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Discover curated decks created by educators, students, and domain experts. Fork any deck into your vault to start spaced repetition scheduling.
        </p>

        {/* Search */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search community decks by subject, topic..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {forkSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 max-w-lg mx-auto">
          <CheckCircle className="w-4 h-4" />
          <span>{forkSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-xs">Browsing public community decks...</p>
        </div>
      ) : decks.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-slate-900/40 border border-slate-800 max-w-md mx-auto">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-white mb-1">No public decks found</p>
          <p className="text-xs text-slate-400">
            Be the first to publish a public flashcard deck from your dashboard!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <DeckCard
              key={deck._id}
              deck={deck}
              showCommunityActions={true}
              onFork={handleFork}
            />
          ))}
        </div>
      )}
    </div>
  );
}

