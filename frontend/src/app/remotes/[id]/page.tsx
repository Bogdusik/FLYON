'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { remotesAPI } from '@/lib/api';
import { Remote } from '@/types';

export default function RemoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const remoteId = params.id as string;

  const [remote, setRemote] = useState<Remote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    loadRemote();
  }, [refreshTick]);

  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const loadRemote = async () => {
    try {
      const res = await remotesAPI.getById(remoteId);
      setRemote(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load remote');
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

  if (!remote) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="glass-card rounded-xl p-8 text-center text-white">
            <p className="mb-4">Remote not found.</p>
            <button
              onClick={() => router.push('/remotes')}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
            >
              Back to remotes
            </button>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white">{remote.name}</h1>
              <p className="text-white/60">
                RadioMaster Pocket {remote.model && `• ${remote.model}`}
              </p>
            </div>
            <Link
              href="/remotes"
              className="px-4 py-2 glass text-white border-2 border-white/20 rounded-lg hover:bg-white/10 transition-all"
            >
              Back
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl text-white font-semibold mb-4">Status</h2>
              <p className="text-white/80 mb-2">
                Status:{' '}
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    remote.status === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : remote.status === 'connecting'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'bg-white/10 text-white/70 border border-white/20'
                  }`}
                >
                  {remote.status}
                </span>
              </p>
              <p className="text-white/70 mb-2">
                Last connected:{' '}
                {remote.last_connected
                  ? new Date(remote.last_connected).toLocaleString()
                  : '—'}
              </p>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl text-white font-semibold mb-4">Metadata</h2>
              <pre className="text-white/80 text-sm bg-white/5 rounded-lg p-4 overflow-auto max-h-64">
                {JSON.stringify(remote.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
