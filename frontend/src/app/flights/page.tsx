'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { flightsAPI } from '@/lib/api';
import { Flight } from '@/types';
import FadeIn from '@/components/FadeIn';
import Navbar from '@/components/Navbar';
import { SkeletonTable } from '@/components/Skeleton';

export default function FlightsPage() {
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadFlights();
  }, [filter]);

  const loadFlights = async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await flightsAPI.getAll(params);
      setFlights(response.data);
    } catch (error: any) {
      // Handle rate limiting gracefully - don't crash
      if (error.isRateLimit) {
        console.warn('Rate limit reached, skipping flights update');
        return;
      }
      console.error('Failed to load flights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <SkeletonTable />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-medium text-white">Flights</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/flights/upload"
              className="btn-dji btn-dji-sm"
            >
              Upload Log
            </Link>
            <div className="flex gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`btn-dji btn-dji-sm ${filter === 'all' ? '' : 'opacity-70'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`btn-dji btn-dji-sm ${filter === 'active' ? '' : 'opacity-70'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`btn-dji btn-dji-sm ${filter === 'completed' ? '' : 'opacity-70'}`}
            >
              Completed
            </button>
            </div>
          </div>
        </div>

        {flights.length === 0 ? (
          <div className="glass-card rounded-lg p-4 text-center border border-white/10">
            <p className="text-white/60 text-sm">No flights found.</p>
          </div>
        ) : (
          <div className="glass-card rounded-lg overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-normal text-white/60 uppercase tracking-wider">Session</th>
                    <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-normal text-white/60 uppercase tracking-wider">Started</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-normal text-white/60 uppercase tracking-wider">Duration</th>
                    <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-normal text-white/60 uppercase tracking-wider">Max Altitude</th>
                    <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-normal text-white/60 uppercase tracking-wider">Distance</th>
                    <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-normal text-white/60 uppercase tracking-wider">Health Score</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-normal text-white/60 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {flights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-white/5 transition-smooth">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/flights/${flight.id}`}
                            className="text-blue-400 hover:text-blue-300 transition-smooth text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-none"
                            title={flight.session_id}
                          >
                            {flight.session_id.length > 8 ? `${flight.session_id.slice(0, 8)}...` : flight.session_id}
                          </Link>
                          <Link
                            href={`/flights/${flight.id}`}
                            className="btn-dji btn-dji-sm whitespace-nowrap text-[10px] sm:text-xs"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              borderColor: 'rgba(59, 130, 246, 0.2)',
                              color: 'rgba(147, 197, 253, 0.9)',
                            }}
                            title="View flight details"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-white/90">
                        {new Date(flight.started_at).toLocaleString()}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/70">
                        {flight.duration_seconds && typeof flight.duration_seconds === 'number'
                          ? `${Math.floor(flight.duration_seconds / 60)}m ${flight.duration_seconds % 60}s`
                          : '-'}
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-white/70">
                        {flight.total_distance_meters && typeof flight.total_distance_meters === 'number'
                          ? `${(flight.total_distance_meters / 1000).toFixed(2)} km`
                          : '-'}
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-white/70">
                        {flight.max_altitude_meters && typeof flight.max_altitude_meters === 'number'
                          ? `${Number(flight.max_altitude_meters).toFixed(1)} m`
                          : '-'}
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                        {flight.health_score && typeof flight.health_score === 'object' && typeof flight.health_score.overall === 'number' ? (
                          <span className={`font-semibold ${
                            flight.health_score.overall >= 80 ? 'text-emerald-400' :
                            flight.health_score.overall >= 60 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {flight.health_score.overall}/100
                          </span>
                        ) : (
                          <span className="text-white/40">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full font-medium whitespace-nowrap ${
                          flight.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          flight.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-white/10 text-white/70 border border-white/20'
                        }`}>
                          {flight.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
