'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { sharingAPI } from '@/lib/api';

export default function SharedFlightPage() {
  const params = useParams();
  const token = params.token as string;

  const [flight, setFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedFlight();
  }, [token]);

  const loadSharedFlight = async () => {
    try {
      const response = await sharingAPI.getSharedFlight(token);
      setFlight(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load shared flight');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-white">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
              Loading...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-white/60 text-lg mb-4">{error || 'Shared flight not found'}</p>
            <Link
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              Go to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <FadeIn>
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              📤 This is a shared flight. View count: {flight.view_count || 0}
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 mb-6">
            <h1 className="text-4xl font-bold text-white mb-4">Shared Flight</h1>
            <p className="text-white/70">Session: {flight.session_id}</p>
            <p className="text-white/60 text-sm mt-2">
              Started: {new Date(flight.started_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Flight Info</h3>
              <div className="space-y-2 text-sm text-white/90">
                <p><span className="font-medium">Status:</span> {flight.status}</p>
                {flight.duration_seconds && (
                  <p><span className="font-medium">Duration:</span> {Math.floor(flight.duration_seconds / 60)}m {flight.duration_seconds % 60}s</p>
                )}
                {flight.total_distance_meters && (
                  <p><span className="font-medium">Distance:</span> {(flight.total_distance_meters / 1000).toFixed(2)} km</p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Statistics</h3>
              <div className="space-y-2 text-sm text-white/90">
                {flight.max_altitude_meters && (
                  <p><span className="font-medium">Max Altitude:</span> {flight.max_altitude_meters.toFixed(1)} m</p>
                )}
                {flight.max_speed_mps && (
                  <p><span className="font-medium">Max Speed:</span> {flight.max_speed_mps.toFixed(1)} m/s</p>
                )}
                {flight.health_score && (
                  <p><span className="font-medium">Health Score:</span> {flight.health_score.overall}/100</p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Actions</h3>
              <Link
                href={`/flights/${flight.id}`}
                className="block w-full px-4 py-2 text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
