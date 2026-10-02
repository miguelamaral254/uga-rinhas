import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Users, UsersRound, UserCog, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar = () => {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    setIsAccountMenuOpen(false);
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/players', label: 'Jogadores', icon: Users },
    { to: '/groups', label: 'Grupos', icon: UsersRound },
    { to: '/profile', label: 'Perfil', icon: UserCog },
  ];

  const DrawerLink = ({ to, label, icon: Icon }) => (
    <Link to={to} className={`lol-drawer-link${pathname === to ? ' is-active' : ''}`} onClick={closeMenu}>
      <Icon size={17} />
      {label}
    </Link>
  );

  const Brand = () => (
    <Link to="/" className="lol-navbar-brand-group" onClick={closeMenu}>
      <img src="/images/udyr-mascot.jpeg" alt="" className="lol-navbar-mascot" />
      <span className="lol-navbar-brand">Uga Rinhas</span>
    </Link>
  );

  if (!account) {
    return (
      <header className="lol-navbar">
        <div className="lol-navbar-inner">
          <Brand />
        </div>
      </header>
    );
  }

  return (
    <>
      {isMenuOpen && <div className="lol-drawer-backdrop" onClick={closeMenu} />}
      {isAccountMenuOpen && (
        <div
          className="lol-account-menu-backdrop"
          onClick={() => setIsAccountMenuOpen(false)}
        />
      )}

      <div className={`lol-drawer${isMenuOpen ? '' : ' is-closed'}`}>
        <div className="lol-drawer-header">
          <Brand />
          <button type="button" className="lol-nav-icon-btn" onClick={closeMenu} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        {links.map((link) => (
          <DrawerLink key={link.to} {...link} />
        ))}

        <hr className="lol-drawer-divider" />
        <button type="button" className="lol-drawer-link lol-drawer-link--danger" onClick={handleLogout}>
          <LogOut size={17} />
          Sair
        </button>
      </div>

      <header className="lol-navbar">
        <div className="lol-navbar-inner">
          <button type="button" className="lol-nav-icon-btn" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <Brand />
        </div>
        <div className="lol-account-menu">
          <button
            type="button"
            className="lol-account-trigger"
            onClick={() => setIsAccountMenuOpen((v) => !v)}
            aria-label="Abrir menu da conta"
          >
            {account.profile_icon_url ? (
              <img src={account.profile_icon_url} alt="" className="lol-account-avatar" />
            ) : (
              <div className="lol-account-avatar lol-account-avatar--placeholder" />
            )}
          </button>

          {isAccountMenuOpen && (
            <div className="lol-account-dropdown">
              <div className="lol-account-dropdown-header">
                <p className="lol-account-dropdown-name">{account.display_name}</p>
                <p className="lol-account-dropdown-riot">
                  {account.riot_game_name}#{account.riot_tag_line}
                </p>
              </div>
              <Link
                to="/profile"
                className="lol-account-dropdown-item"
                onClick={() => setIsAccountMenuOpen(false)}
              >
                <Settings size={16} /> Configurações
              </Link>
              <button
                type="button"
                className="lol-account-dropdown-item lol-account-dropdown-item--danger"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
