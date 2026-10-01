import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/base/Navbar';
import Dashboard from './views/Dashboard';
import Players from './views/Players';
import PlayerDetail from './views/PlayerDetail';
import './index.css';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="lol-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
