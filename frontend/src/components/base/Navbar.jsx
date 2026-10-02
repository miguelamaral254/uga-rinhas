import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Users, UsersRound, UserCog, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar = () => {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/players', label: 'Jogadores', icon: Users },
    ...(account
      ? [
          { to: '/groups', label: 'Grupos', icon: UsersRound },
          { to: '/profile', label: 'Perfil', icon: UserCog },
        ]
      : [{ to: '/login', label: 'Entrar', icon: LogIn }]),
  ];

  const DrawerLink = ({ to, label, icon: Icon }) => (
    <Link to={to} className={`lol-drawer-link${pathname === to ? ' is-active' : ''}`} onClick={closeMenu}>
      <Icon size={17} />
      {label}
    </Link>
  );

  return (
    <>
      {isMenuOpen && <div className="lol-drawer-backdrop" onClick={closeMenu} />}

      <div className={`lol-drawer${isMenuOpen ? '' : ' is-closed'}`}>
        <div className="lol-drawer-header">
          <span className="lol-navbar-brand">Uga Rinhas</span>
          <button type="button" className="lol-nav-icon-btn" onClick={closeMenu} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        {links.map((link) => (
          <DrawerLink key={link.to} {...link} />
        ))}

        {account && (
          <>
            <hr className="lol-drawer-divider" />
            <button type="button" className="lol-drawer-link lol-drawer-link--danger" onClick={handleLogout}>
              <LogOut size={17} />
              Sair
            </button>
          </>
        )}
      </div>

      <header className="lol-navbar">
        <div className="lol-navbar-inner">
          <button type="button" className="lol-nav-icon-btn" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <span className="lol-navbar-brand">Uga Rinhas</span>
        </div>
        {account && <span className="lol-navbar-account">{account.display_name}</span>}
      </header>
    </>
  );
};
