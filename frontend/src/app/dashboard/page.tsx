'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, flightsAPI, dronesAPI, sharingAPI } from '@/lib/api';
import { Flight, Drone } from '@/types';
import FadeIn from '@/components/FadeIn';
import Navbar from '@/components/Navbar';
import { SkeletonStats, SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Enable keyboard shortcuts
  useAppShortcuts();

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
        // Skip rate limit errors silently
        if (flightsRes.reason?.isRateLimit) {
          console.warn('Rate limit reached, skipping flights update');
        } else {
          console.error('Failed to load flights:', flightsRes.reason);
        }
        setFlights([]);
      }

      // Handle drones data (non-critical, can fail)
      if (dronesRes.status === 'fulfilled') {
        setDrones(dronesRes.value.data);
      } else {
        // Skip rate limit errors silently
        if (dronesRes.reason?.isRateLimit) {
          console.warn('Rate limit reached, skipping drones update');
        } else {
          console.error('Failed to load drones:', dronesRes.reason);
        }
        setDrones([]);
      }

      // Handle achievements data (non-critical, can fail)
      if (achievementsRes.status === 'fulfilled') {
        setAchievements(achievementsRes.value.data);
      } else {
        // Skip rate limit errors silently
        if (achievementsRes.reason?.isRateLimit) {
          console.warn('Rate limit reached, skipping achievements update');
        } else {
          console.error('Failed to load achievements:', achievementsRes.reason);
        }
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

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {loading ? (
          <>
            <SkeletonStats />
            <div className="mt-4 sm:mt-6">
              <SkeletonList />
            </div>
          </>
        ) : (
          <>
            <FadeIn>
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-medium text-white mb-0.5 sm:mb-1">
                  Welcome back, {user?.name || user?.email}
                </h2>
                <p className="text-white/50 text-[10px] sm:text-xs">Monitor and analyze your drone flights</p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <FadeIn delay={100}>
                <div className="glass-card rounded-lg p-3 sm:p-4 border border-white/10">
                  <h3 className="text-[10px] sm:text-xs font-normal text-white/60 mb-1 sm:mb-1.5">Total Flights</h3>
                  <p className="text-xl sm:text-2xl font-medium text-white">{flights.length}</p>
                </div>
              </FadeIn>
              <FadeIn delay={200}>
                <div className="glass-card rounded-lg p-3 sm:p-4 border border-white/10">
                  <h3 className="text-[10px] sm:text-xs font-normal text-white/60 mb-1 sm:mb-1.5">Active Drones</h3>
                  <p className="text-xl sm:text-2xl font-medium text-white">{drones.length}</p>
                </div>
              </FadeIn>
              <FadeIn delay={300}>
                <div className="glass-card rounded-lg p-3 sm:p-4 border border-white/10">
                  <h3 className="text-[10px] sm:text-xs font-normal text-white/60 mb-1 sm:mb-1.5">Achievements</h3>
                  <p className="text-xl sm:text-2xl font-medium text-white">
                    {achievements.length}
                  </p>
                </div>
              </FadeIn>
            </div>

            {achievements.length > 0 && (
              <FadeIn delay={400}>
                <div className="glass-card rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4 border border-white/10">
                  <h3 className="text-xs sm:text-sm font-medium text-white mb-1.5 sm:mb-2">Your Achievements</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-md text-center"
                      >
                        <div className="text-lg sm:text-xl mb-1 sm:mb-1.5">🏆</div>
                        <p className="text-white text-xs sm:text-sm font-semibold capitalize line-clamp-2">
                          {achievement.achievement_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-white/60 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
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
            <div className="glass-card rounded-lg overflow-hidden border border-white/10">
              <div className="p-3 sm:p-4 border-b border-white/5">
                <h3 className="text-xs sm:text-sm font-medium text-white">Recent Flights</h3>
              </div>
              <div className="p-3 sm:p-4">
                {flights.length === 0 ? (
                  <p className="text-white/50 text-sm">No flights yet. Start a flight to see it here!</p>
                ) : (
                  <div className="space-y-3">
                    {flights.map((flight, index) => (
                      <FadeIn key={flight.id} delay={500 + index * 50}>
                        <Link
                          href={`/flights/${flight.id}`}
                          className="block glass-card rounded-md p-2 sm:p-2.5 border border-white/10 hover:bg-white/5 transition-smooth group"
                        >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm text-white truncate" title={flight.session_id}>
                            Flight {flight.session_id.length > 8 ? `${flight.session_id.slice(0, 8)}...` : flight.session_id}
                          </p>
                          <p className="text-[10px] sm:text-xs text-white/60">
                            {new Date(flight.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex sm:block sm:text-right items-center sm:items-end gap-2 sm:gap-0">
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                            flight.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            flight.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-white/10 text-white/70 border border-white/20'
                          }`}>
                            {flight.status}
                          </span>
                          {flight.health_score && typeof flight.health_score === 'object' && typeof flight.health_score.overall === 'number' ? (
                            <p className="text-xs sm:text-sm text-white/60 sm:mt-1">
                              Score: {flight.health_score.overall}/100
                            </p>
                          ) : null}
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
