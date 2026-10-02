import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Swords, Users, UsersRound, UserCog, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar = () => {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="lol-navbar">
      <span className="lol-navbar-brand">Uga Rinhas</span>
      <div className="lol-navbar-links">
        <NavLink to="/" end className="lol-navbar-link">
          <Swords size={16} /> Placar
        </NavLink>
        <NavLink to="/players" className="lol-navbar-link">
          <Users size={16} /> Jogadores
        </NavLink>
        {account && (
          <NavLink to="/groups" className="lol-navbar-link">
            <UsersRound size={16} /> Grupos
          </NavLink>
        )}
        {account && (
          <NavLink to="/profile" className="lol-navbar-link">
            <UserCog size={16} /> Perfil
          </NavLink>
        )}
        {account ? (
          <button className="lol-navbar-link lol-navbar-logout" onClick={handleLogout}>
            <LogOut size={16} /> Sair ({account.display_name})
          </button>
        ) : (
          <NavLink to="/login" className="lol-navbar-link">
            <LogIn size={16} /> Entrar
          </NavLink>
        )}
      </div>
    </nav>
  );
};
