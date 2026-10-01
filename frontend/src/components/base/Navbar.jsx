import React from 'react';
import { NavLink } from 'react-router-dom';
import { Swords, Users } from 'lucide-react';

export const Navbar = () => (
  <nav className="lol-navbar">
    <span className="lol-navbar-brand">LoL Tracker</span>
    <div className="lol-navbar-links">
      <NavLink to="/" end className="lol-navbar-link">
        <Swords size={16} /> Placar
      </NavLink>
      <NavLink to="/players" className="lol-navbar-link">
        <Users size={16} /> Jogadores
      </NavLink>
    </div>
  </nav>
);
