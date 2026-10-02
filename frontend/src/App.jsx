import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/base/Navbar';
import { LoadingScreen } from './components/common/LoadingScreen';
import Dashboard from './views/Dashboard';
import Players from './views/Players';
import PlayerDetail from './views/PlayerDetail';
import Login from './views/Login';
import Register from './views/Register';
import Groups from './views/Groups';
import GroupDetail from './views/GroupDetail';
import GroupMatch from './views/GroupMatch';
import Profile from './views/Profile';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { account, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!account) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { account, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (account) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="lol-main">
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/:id"
              element={
                <ProtectedRoute>
                  <PlayerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/:id"
              element={
                <ProtectedRoute>
                  <GroupMatch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
