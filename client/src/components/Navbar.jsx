import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Flame,
  Globe,
  Plus,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function Navbar({ onOpenCreateDeck }) {
  const { user, userStats, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Concept<span className="text-indigo-400">Cards</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase -mt-1">
                  Spaced Repetition
                </span>
              </div>
            </Link>

            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive('/dashboard')
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/explore"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive('/explore')
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Globe className="w-4 h-4 text-slate-400" />
                  Explore Public
                </Link>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Streak Counter */}
                <div
                  title="Consecutive daily study streak"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold"
                >
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{user?.streak || 0}d streak</span>
                </div>

                {/* Due Cards Pill */}
                {userStats?.dueCards > 0 && (
                  <Link
                    to="/study/all"
                    title="Review cards due today across all decks"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span>{userStats.dueCards} Due</span>
                  </Link>
                )}

                {/* Create Deck Button */}
                {onOpenCreateDeck && (
                  <button
                    type="button"
                    onClick={onOpenCreateDeck}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Deck</span>
                  </button>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase()}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-800">
                        <p className="text-sm font-bold text-white truncate">
                          {user?.displayName || user?.username}
                        </p>
                        <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
                      </div>

                      <div className="px-4 py-2 text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Target:</span>
                          <span className="font-semibold text-slate-200">
                            {user?.dailyReviewTarget || 20} cards/day
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Decks:</span>
                          <span className="font-semibold text-slate-200">
                            {userStats?.totalDecks || 0}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/explore"
                  className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
                >
                  Explore
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/30 transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/30">
                <Flame className="w-3.5 h-3.5" />
                <span>{user?.streak || 0}d</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-semibold text-slate-200 hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                to="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-semibold text-slate-200 hover:bg-slate-800"
              >
                Community Decks
              </Link>
              {onOpenCreateDeck && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCreateDeck();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-base font-semibold text-indigo-400 hover:bg-slate-800"
                >
                  + Create New Deck
                </button>
              )}
              <div className="border-t border-slate-800 pt-3">
                <div className="px-3 pb-2 text-xs text-slate-400">
                  Signed in as <span className="text-white font-bold">{user?.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-base font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-semibold text-slate-200 hover:bg-slate-800"
              >
                Explore Decks
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-semibold text-slate-200 hover:bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl bg-indigo-600 text-white font-bold"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

