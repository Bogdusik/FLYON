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
    <nav className="glass-strong sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold gradient-text">
            FLYON
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/dashboard"
              className={`transition-smooth relative group ${
                isActive('/dashboard')
                  ? 'text-white font-semibold'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Dashboard
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-blue-400 transition-all ${
                  isActive('/dashboard') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/drones"
              className={`transition-smooth relative group ${
                isActive('/drones')
                  ? 'text-white font-semibold'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Drones
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-blue-400 transition-all ${
                  isActive('/drones') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/flights"
              className={`transition-smooth relative group ${
                isActive('/flights')
                  ? 'text-white font-semibold'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Flights
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-blue-400 transition-all ${
                  isActive('/flights') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <Link
              href="/remotes"
              className={`transition-smooth relative group ${
                isActive('/remotes')
                  ? 'text-white font-semibold'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Remotes
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-blue-400 transition-all ${
                  isActive('/remotes') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>

            {/* Profile Icon with Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                aria-label="Profile menu"
              >
                {user && user.email ? (
                  getInitials(user.name, user.email)
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
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
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl border border-white/10 overflow-hidden bg-slate-900/90 backdrop-blur-xl">
                  <div className="p-4 border-b border-white/10">
                    <p className="text-white font-semibold text-sm">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-white/70 text-xs truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 transition-smooth text-sm"
                    >
                      Edit Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 transition-smooth text-sm"
                    >
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-white/10 py-1 bg-red-500/5">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-300 hover:text-red-200 hover:bg-red-500/15 transition-smooth text-sm"
                    >
                      Logout
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
