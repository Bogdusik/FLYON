'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flightsAPI } from '@/lib/api';
import { Flight } from '@/types';
import Navbar from '@/components/Navbar';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import Link from 'next/link';

export default function LiveViewPage() {
  const router = useRouter();
  const [activeFlights, setActiveFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveFlights();
    // Poll for active flights every 5 seconds
    const interval = setInterval(loadActiveFlights, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveFlights = async () => {
    try {
      const response = await flightsAPI.getAll({ status: 'active', limit: 10 });
      const flights = response.data;
      setActiveFlights(flights);

      // If only one active flight, redirect to it
      if (flights.length === 1) {
        router.push(`/flights/${flights[0].id}/live`);
        return;
      }
    } catch (error: any) {
      if (error.isRateLimit) {
        return; // Silently skip on rate limit
      }
      console.error('Failed to load active flights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Live View</h1>
          <SkeletonList />
        </main>
      </div>
    );
  }

  if (activeFlights.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Live View</h1>
          <div className="glass-card rounded-lg p-4 text-center border border-white/10">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white/70 mb-4 text-sm">No active flights at the moment</p>
            <p className="text-white/50 mb-4 text-xs">Start a flight to view it live</p>
            <Link href="/flights" className="btn-dji btn-dji-sm inline-block">
              View All Flights
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Live View</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {activeFlights.map((flight) => (
            <Link
              key={flight.id}
              href={`/flights/${flight.id}/live`}
              className="glass-card rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-300">LIVE</span>
                </div>
                <span className="text-xs text-white/50">Session: {flight.session_id?.slice(0, 8)}...</span>
              </div>
              <h3 className="text-sm font-medium text-white mb-1 group-hover:text-emerald-300 transition-colors">
                Flight {flight.session_id?.slice(0, 15)}...
              </h3>
              <p className="text-xs text-white/60 mb-3">
                Started: {new Date(flight.started_at).toLocaleTimeString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span>View Live →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
