'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

interface NavbarProps {
  currentPath?: string;
}

export default function Navbar({ currentPath }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <nav className="glass-strong sticky top-0 z-50 border-b border-white/5">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="text-base sm:text-lg font-medium text-white">
            FLYON
          </Link>
          <div className="flex gap-2 sm:gap-3 md:gap-5 items-center">
            <Link
              href="/dashboard"
              className={`text-xs sm:text-sm transition-smooth relative group ${
                isActive('/dashboard')
                  ? 'text-white font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
              <span
                className={`absolute -bottom-1 left-0 h-px bg-white/60 transition-all ${
                  isActive('/dashboard') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/drones"
              className={`text-xs sm:text-sm transition-smooth relative group ${
                isActive('/drones')
                  ? 'text-white font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Drones
              <span
                className={`absolute -bottom-1 left-0 h-px bg-white/60 transition-all ${
                  isActive('/drones') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/flights"
              className={`text-xs sm:text-sm transition-smooth relative group ${
                isActive('/flights')
                  ? 'text-white font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Flights
              <span
                className={`absolute -bottom-1 left-0 h-px bg-white/60 transition-all ${
                  isActive('/flights') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/live-view"
              className={`text-xs sm:text-sm transition-smooth relative group ${
                pathname?.startsWith('/live-view') || pathname?.includes('/live')
                  ? 'text-white font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Live View</span>
              <span className="sm:hidden">Live</span>
              <span
                className={`absolute -bottom-1 left-0 h-px bg-white/60 transition-all ${
                  pathname?.startsWith('/live-view') || pathname?.includes('/live') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/remotes"
              className={`text-xs sm:text-sm transition-smooth relative group ${
                isActive('/remotes')
                  ? 'text-white font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Remotes</span>
              <span className="sm:hidden">Rem</span>
              <span
                className={`absolute -bottom-1 left-0 h-px bg-white/60 transition-all ${
                  isActive('/remotes') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>

            {/* Profile Icon with Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-medium transition-all cursor-pointer relative overflow-hidden group ${
                  showProfileMenu 
                    ? 'bg-white/15 border border-white/20' 
                    : 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20'
                }`}
                aria-label="Profile menu"
              >
                {user && user.email ? (
                  <span className="relative z-10">{getInitials(user.name, user.email)}</span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 relative z-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>

              {showProfileMenu && (
                <div 
                  className="dropdown-dji absolute right-0 mt-2 sm:mt-3 w-48 sm:w-56 overflow-hidden"
                  style={{
                    animation: 'dropdownFadeIn 0.2s ease-out',
                  }}
                >
                  {/* Header */}
                  <div className="relative p-3 sm:p-4 border-b border-white/5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-xs sm:text-sm border border-white/10">
                            {user && user.email ? getInitials(user.name, user.email) : 'U'}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-xs sm:text-sm truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-white/50 text-[10px] sm:text-xs truncate mt-0.5">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 text-white/80 hover:text-white transition-all hover:bg-white/5"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm font-normal">Edit Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 text-white/80 hover:text-white transition-all hover:bg-white/5"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-normal">Settings</span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/5 my-1"></div>

                  {/* Logout Button */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="group relative flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 py-1.5 sm:py-2 text-white/60 hover:text-white/80 transition-all hover:bg-white/5"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm font-normal">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
