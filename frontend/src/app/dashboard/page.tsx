'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, flightsAPI, dronesAPI, sharingAPI } from '@/lib/api';
import { Flight, Drone } from '@/types';
import FadeIn from '@/components/FadeIn';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load data in parallel with timeout protection
      const [userRes, flightsRes, dronesRes, achievementsRes] = await Promise.allSettled([
        authAPI.getMe(),
        flightsAPI.getAll({ limit: 10 }),
        dronesAPI.getAll(),
        sharingAPI.getAchievements(),
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

      // Handle achievements data (non-critical, can fail)
      if (achievementsRes.status === 'fulfilled') {
        setAchievements(achievementsRes.value.data);
      } else {
        console.error('Failed to load achievements:', achievementsRes.reason);
        setAchievements([]);
      }

      // Check for new achievements
      try {
        await sharingAPI.checkAchievements();
      } catch (err) {
        // Silent fail
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Don't redirect on error, just show empty state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

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
            <FadeIn>
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-white mb-2">
                  Welcome back, {user?.name || user?.email}!
                </h2>
                <p className="text-white/70">Monitor and analyze your drone flights</p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <FadeIn delay={100}>
                <div className="glass-card rounded-xl p-6 hover-lift group cursor-pointer">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">Total Flights</h3>
                  <p className="text-4xl font-bold gradient-text inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">{flights.length}</p>
                </div>
              </FadeIn>
              <FadeIn delay={200}>
                <div className="glass-card rounded-xl p-6 hover-lift group cursor-pointer">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">Active Drones</h3>
                  <p className="text-4xl font-bold gradient-text inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">{drones.length}</p>
                </div>
              </FadeIn>
              <FadeIn delay={300}>
                <div className="glass-card rounded-xl p-6 hover-lift group cursor-pointer">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">Achievements</h3>
                  <p className="text-4xl font-bold gradient-text inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">
                    {achievements.length}
                  </p>
                </div>
              </FadeIn>
            </div>

            {achievements.length > 0 && (
              <FadeIn delay={400}>
                <div className="glass-card rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Your Achievements</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg text-center"
                      >
                        <div className="text-3xl mb-2">🏆</div>
                        <p className="text-white text-sm font-semibold capitalize">
                          {achievement.achievement_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-white/60 text-xs mt-1">
                          {new Date(achievement.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </>
        )}

        {!loading && (
          <FadeIn delay={400}>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">Recent Flights</h3>
              </div>
              <div className="p-6">
                {flights.length === 0 ? (
                  <p className="text-white/60">No flights yet. Start a flight to see it here!</p>
                ) : (
                  <div className="space-y-3">
                    {flights.map((flight, index) => (
                      <FadeIn key={flight.id} delay={500 + index * 50}>
                        <Link
                          href={`/flights/${flight.id}`}
                          className="block glass-card rounded-lg p-4 hover-lift transition-smooth group"
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
                      </FadeIn>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  );
}
