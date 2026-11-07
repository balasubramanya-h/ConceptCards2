import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DeckDetailsPage from './pages/DeckDetailsPage';
import StudyPage from './pages/StudyPage';
import ExplorePage from './pages/ExplorePage';

function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [triggerCreateModal, setTriggerCreateModal] = useState(false);

  // Hide global navbar on dedicated study immersion screen
  const isStudyScreen = location.pathname.startsWith('/study');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {!isStudyScreen && (
        <Navbar onOpenCreateDeck={() => setTriggerCreateModal(true)} />
      )}

      <main className="flex-1">
        <Routes>
          {/* Public Landing or Redirect to Dashboard if logged in */}
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
          />

          {/* Authentication */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
          />

          {/* Public Community Exploration */}
          <Route path="/explore" element={<ExplorePage />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage
                  openCreateModalProp={triggerCreateModal}
                  onCloseCreateModalProp={() => setTriggerCreateModal(false)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deck/:id"
            element={
              <ProtectedRoute>
                <DeckDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/:deckId"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

