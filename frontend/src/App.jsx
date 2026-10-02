import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/base/Navbar';
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
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!account) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="lol-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
            <Route path="/matches/:id" element={<GroupMatch />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
