'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { flightsAPI } from '@/lib/api';
import { Flight } from '@/types';
import FadeIn from '@/components/FadeIn';
import Navbar from '@/components/Navbar';

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
    } catch (error) {
      console.error('Failed to load flights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-white/70">Loading flights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Flight History</h1>
          <div className="flex gap-2">
            <Link
              href="/flights/upload"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Upload Log
            </Link>
            <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-smooth ${
                filter === 'all' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                  : 'glass text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-smooth ${
                filter === 'active' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                  : 'glass text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-smooth ${
                filter === 'completed' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                  : 'glass text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Completed
            </button>
            </div>
          </div>
        </div>

        {flights.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-white/70 text-lg">No flights found.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Session</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Distance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Max Altitude</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Health Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {flights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-white/5 transition-smooth">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/flights/${flight.id}`}
                            className="text-blue-400 hover:text-blue-300 transition-smooth"
                          >
                            {flight.session_id.slice(0, 12)}...
                          </Link>
                          <Link
                            href={`/flights/${flight.id}`}
                            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-smooth"
                            title="View flight details"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/90">
                        {new Date(flight.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {flight.duration_seconds && typeof flight.duration_seconds === 'number'
                          ? `${Math.floor(flight.duration_seconds / 60)}m ${flight.duration_seconds % 60}s`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {flight.total_distance_meters && typeof flight.total_distance_meters === 'number'
                          ? `${(flight.total_distance_meters / 1000).toFixed(2)} km`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {flight.max_altitude_meters && typeof flight.max_altitude_meters === 'number'
                          ? `${Number(flight.max_altitude_meters).toFixed(1)} m`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {flight.health_score ? (
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
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
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
