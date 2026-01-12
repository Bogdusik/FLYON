'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, flightsAPI, dronesAPI } from '@/lib/api';
import { Flight, Drone } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load data in parallel with timeout protection
      const [userRes, flightsRes, dronesRes] = await Promise.allSettled([
        authAPI.getMe(),
        flightsAPI.getAll({ limit: 10 }),
        dronesAPI.getAll(),
      ]);

      // Handle user data
      if (userRes.status === 'fulfilled') {
        setUser(userRes.value.data);
      } else {
        console.error('Failed to load user:', userRes.reason);
        router.push('/login');
        return;
      }

      // Handle flights data (non-critical, can fail)
      if (flightsRes.status === 'fulfilled') {
        setFlights(flightsRes.value.data);
      } else {
        console.error('Failed to load flights:', flightsRes.reason);
        setFlights([]);
      }

      // Handle drones data (non-critical, can fail)
      if (dronesRes.status === 'fulfilled') {
        setDrones(dronesRes.value.data);
      } else {
        console.error('Failed to load drones:', dronesRes.reason);
        setDrones([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Don't redirect on error, just show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="text-2xl font-bold gradient-text">FLYON</Link>
            <div className="flex gap-6 items-center">
              <Link 
                href="/dashboard" 
                className="text-white font-semibold relative group"
              >
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-400"></span>
              </Link>
              <Link 
                href="/drones" 
                className="text-white/90 hover:text-white transition-smooth relative group"
              >
                Drones
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
              <Link 
                href="/flights" 
                className="text-white/90 hover:text-white transition-smooth relative group"
              >
                Flights
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-white/90 hover:text-white transition-smooth rounded-lg hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
              <div className="text-xl text-white">Loading...</div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user?.name || user?.email}!
              </h2>
              <p className="text-white/70">Monitor and analyze your drone flights</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white/80 mb-2">Total Flights</h3>
                <p className="text-4xl font-bold gradient-text">{flights.length}</p>
              </div>
              <div className="glass-card rounded-xl p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white/80 mb-2">Active Drones</h3>
                <p className="text-4xl font-bold gradient-text">{drones.length}</p>
              </div>
              <div className="glass-card rounded-xl p-6 hover-lift">
                <h3 className="text-lg font-semibold text-white/80 mb-2">Active Flights</h3>
                <p className="text-4xl font-bold gradient-text">
                  {flights.filter(f => f.status === 'active').length}
                </p>
              </div>
            </div>
          </>
        )}

        {!loading && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">Recent Flights</h3>
            </div>
            <div className="p-6">
              {flights.length === 0 ? (
                <p className="text-white/60">No flights yet. Start a flight to see it here!</p>
              ) : (
                <div className="space-y-3">
                  {flights.map((flight) => (
                    <Link
                      key={flight.id}
                      href={`/flights/${flight.id}`}
                      className="block glass-card rounded-lg p-4 hover-lift transition-smooth"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">
                            Flight {flight.session_id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-white/60">
                            {new Date(flight.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            flight.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            flight.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-white/10 text-white/70 border border-white/20'
                          }`}>
                            {flight.status}
                          </span>
                          {flight.health_score && (
                            <p className="text-sm text-white/60 mt-1">
                              Score: {flight.health_score.overall}/100
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
