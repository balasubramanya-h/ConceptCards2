import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  FolderTree,
  Users,
  Clock,
  ArrowRight,
  CheckCircle,
  Repeat,
  Brain,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const [demoFlipped, setDemoFlipped] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Feature Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-8 animate-bounce duration-1000">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Spaced Repetition + Duplicate Prevention</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Master any concept.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400">
            Never forget again.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The collaborative knowledge engine powered by the SuperMemo-2 algorithm,
          real-time duplicate prevention, and deep hierarchical deck trees.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform hover:-translate-y-0.5"
          >
            <span>Start Learning Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-base transition-all"
          >
            <span>Explore Demo</span>
          </Link>
        </div>

        {/* Interactive Hero Card Demo */}
        <div className="mt-16 max-w-lg mx-auto">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
            Interactive Flashcard Preview (Click to Flip)
          </p>
          <div
            onClick={() => setDemoFlipped(!demoFlipped)}
            className="perspective-1000 cursor-pointer group"
          >
            <div
              className={`relative h-64 rounded-3xl p-8 border transition-all duration-700 preserve-3d shadow-2xl ${
                demoFlipped
                  ? 'rotate-y-180 bg-gradient-to-br from-slate-900 to-indigo-950/80 border-indigo-500/50 shadow-indigo-500/10'
                  : 'bg-gradient-to-br from-slate-900 to-slate-800/80 border-slate-700/80 group-hover:border-indigo-500/40'
              }`}
            >
              {/* Front Side */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden ${
                  demoFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-mono uppercase text-indigo-400 font-bold">Front • Prompt</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">SM-2 Spaced</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    What is the SuperMemo SM-2 algorithm?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click card to reveal answer & scheduled intervals
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Tag: #neuroscience #learning</span>
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    Flip <Repeat className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Back Side */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden rotate-y-180 ${
                  demoFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-mono uppercase text-emerald-400 font-bold">Back • Solution</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Mastered
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    An algorithmic spaced-repetition model that calculates optimal intervals
                    (1d, 6d, I × EF) based on user recall grades (0–5) and dynamic Ease Factors
                    to beat the forgetting curve.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-indigo-900/40 text-[11px]">
                  <span className="text-slate-400">Next review options:</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Again: 1d</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Good: 6d</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Easy: 15d</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="py-20 bg-slate-900/60 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white">
              Built for serious learners, teams, and researchers
            </h2>
            <p className="mt-3 text-slate-400">
              Everything you need to organize massive knowledge trees, prevent duplicates, and retain 95%+ of what you study.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated SM-2 Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scientific spaced intervals calculate personalized review schedules, ease factors, and mastery states automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Duplicate Prevention</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Levenshtein, Jaccard, and bigram Dice analysis screen incoming cards in real-time, blocking redundant flashcards.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-sky-600/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FolderTree className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Hierarchical Tree Decks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nest subdecks infinitely inside parent categories. Study any leaf deck or combine child branches in one unified session.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Collaborative Hub</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Invite collaborators with fine-grained viewer/editor roles, fork public community decks, and synchronize knowledge together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-300">ConceptCards Platform</span>
            <span>• SuperMemo-2 Spaced Repetition</span>
          </div>
          <p>© 2026 ConceptCards. Production Ready MERN Monorepo.</p>
        </div>
      </footer>
    </div>
  );
}

