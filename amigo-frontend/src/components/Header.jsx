import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaVideo, FaBell, FaChevronDown, FaCog, FaSignOutAlt,
  FaUser, FaSearch, FaBars, FaTimes,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getAvatarGradient } from '../design-tokens';

const NAV_LINKS = [
  { label: 'Dashboard',   path: '/dashboard' },
  { label: 'Meetings',    path: '/meetings' },
  { label: 'History',     path: '/history' },
  { label: 'Recordings',  path: '/recordings' },
  { label: 'Team',        path: '/team' },
];

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const Header = () => {
  const navigate           = useNavigate();
  const location           = useLocation();
  const { user, logout }   = useAuth();

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // FIX: logout now just clears state in AuthContext; we handle the
  // navigate('/auth') here so there's one clear owner of navigation.
  const handleLogout = async () => {
    await logout();
    navigate('/auth', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const initials   = getInitials(user?.fullName);
  const avatarGrad = getAvatarGradient(user?.id ?? 0);

  return (
    <header className="sticky top-0 z-50 w-full bg-beige-50/95 backdrop-blur-sm border-b border-beige-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-8">

          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-sage flex items-center justify-center shadow-sage-sm group-hover:shadow-sage-md transition-shadow duration-200">
              <FaVideo className="text-white text-sm" />
            </div>
            <span className="font-display font-bold text-lg text-charcoal-900 tracking-tight">Amigo</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(path)
                    ? 'bg-sage-100 text-sage-700 font-semibold'
                    : 'text-charcoal-600 hover:bg-beige-200 hover:text-charcoal-800',
                ].join(' ')}
              >
                {label}
                {isActive(path) && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-sage-500 align-middle" />
                )}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Search */}
            {searchOpen ? (
              <div className="flex items-center gap-2 animate-scale-in">
                <input autoFocus className="input w-48 text-sm" placeholder="Search..."
                  onBlur={() => setSearchOpen(false)} />
                <button className="btn-icon" onClick={() => setSearchOpen(false)}>
                  <FaTimes className="text-xs" />
                </button>
              </div>
            ) : (
              <button className="btn-icon" onClick={() => setSearchOpen(true)} title="Search">
                <FaSearch className="text-sm" />
              </button>
            )}

            {/* Notifications */}
            <button className="btn-icon relative" title="Notifications">
              <FaBell className="text-sm" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-mint-500 border-2 border-beige-50" />
            </button>

            {/* New Meeting */}
            <button
              className="hidden sm:flex btn-primary text-xs px-3 py-2 gap-1.5"
              onClick={() => navigate('/new-meeting')}
            >
              <FaVideo className="text-xs" /> New Meeting
            </button>

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen(p => !p)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-beige-200 transition-colors duration-200"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarGrad }}
                >
                  {user?.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                    : initials}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-charcoal-800">
                    {user?.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <span className="text-[10px] text-charcoal-400">Online</span>
                </div>
                <FaChevronDown className={`text-[10px] text-charcoal-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-beige-50 border border-beige-300 rounded-2xl shadow-card-hover py-1.5 animate-scale-in z-50">
                  <div className="px-4 py-2.5 border-b border-beige-200">
                    <p className="text-sm font-semibold text-charcoal-900">{user?.fullName}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/user-profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-beige-100 hover:text-sage-700 transition-colors"
                    >
                      <FaUser className="text-charcoal-400" /> My Profile
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/user-profile', { state: { tab: 'settings' } }); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-beige-100 hover:text-sage-700 transition-colors"
                    >
                      <FaCog className="text-charcoal-400" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-beige-200 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile burger */}
            <button className="md:hidden btn-icon" onClick={() => setMobileOpen(p => !p)}>
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-beige-200 bg-beige-50 animate-slide-down">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => { navigate(path); setMobileOpen(false); }}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                  isActive(path)
                    ? 'bg-sage-100 text-sage-700 font-semibold'
                    : 'text-charcoal-600 hover:bg-beige-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-beige-200 mt-1 space-y-1">
              <button
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-charcoal-600 hover:bg-beige-200 transition-colors flex items-center gap-3"
                onClick={() => { navigate('/user-profile'); setMobileOpen(false); }}
              >
                <FaUser className="text-charcoal-400" /> My Profile
              </button>
              <button
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-charcoal-600 hover:bg-beige-200 transition-colors flex items-center gap-3"
                onClick={() => { navigate('/user-profile', { state: { tab: 'settings' } }); setMobileOpen(false); }}
              >
                <FaCog className="text-charcoal-400" /> Settings
              </button>
              <button
                className="btn-primary w-full justify-center"
                onClick={() => { navigate('/new-meeting'); setMobileOpen(false); }}
              >
                <FaVideo /> New Meeting
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
