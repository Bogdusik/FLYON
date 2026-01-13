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
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
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
      setError(''); // Clear any previous errors on success
    } catch (err: any) {
      // Handle rate limiting gracefully - don't show error, just skip this update
      if (err.isRateLimit) {
        console.warn('Rate limit reached, skipping remote update');
        return; // Don't update error state, just skip silently
      }
      setError(err.response?.data?.error || 'Failed to load remote');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!remote) return;
    setConnecting(true);
    setError('');
    try {
      await remotesAPI.updateStatus(remote.id, 'connecting');
      await loadRemote();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect remote');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!remote) return;
    setDisconnecting(true);
    setError('');
    try {
      await remotesAPI.disconnect(remote.id);
      await loadRemote();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect remote');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-white">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mb-3"></div>
              <div className="text-sm text-white/70">Loading...</div>
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
        <main className="container mx-auto px-6 py-4">
          <div className="glass-card rounded-lg p-5 text-center border border-white/10">
            <p className="text-white/60 mb-4 text-sm">Remote not found.</p>
            <button
              onClick={() => router.push('/remotes')}
              className="btn-dji btn-dji-sm"
            >
              Back to Remotes
            </button>
          </div>
        </main>
      </div>
    );
  }

  const metadata = remote.metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-6 py-6">
        <FadeIn>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-medium text-white mb-1">{remote.name}</h1>
              <p className="text-white/50 text-xs">
                {remote.model ? `${remote.model} • ` : ''}RadioMaster Pocket
              </p>
            </div>
            <Link
              href="/remotes"
              className="btn-dji btn-dji-sm opacity-70"
            >
              Back
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-4 text-red-400 hover:text-red-300 transition-colors"
                aria-label="Close error"
              >
                ×
              </button>
            </div>
          )}

          {/* Status Card */}
          <div className="glass-card rounded-lg p-5 mb-4 border border-white/10">
            <h2 className="text-sm font-medium text-white mb-4">Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Status</span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-normal ${
                    remote.status === 'connected'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : remote.status === 'connecting'
                      ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  {remote.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Last Connected</span>
                <span className="text-white/80 text-sm">
                  {remote.last_connected
                    ? new Date(remote.last_connected).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Created</span>
                <span className="text-white/80 text-sm">
                  {new Date(remote.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Control */}
          <div className="glass-card rounded-lg p-5 mb-4 border border-white/10">
            <h2 className="text-sm font-medium text-white mb-4">Connection</h2>
            {remote.status === 'connected' ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="btn-dji btn-dji-sm w-full flex items-center justify-center gap-2"
              >
                {disconnecting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border border-white/30 border-t-transparent"></div>
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-dji btn-dji-sm w-full flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border border-white/30 border-t-transparent"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            )}
            <p className="text-white/40 text-xs mt-3">
              {remote.status === 'connected'
                ? 'Remote is connected and ready to use.'
                : remote.status === 'connecting'
                ? 'Remote is connecting. Please wait...'
                : 'Remote is disconnected. Click Connect to establish connection.'}
            </p>
          </div>

          {/* Detailed Information */}
          <div className="glass-card rounded-lg p-5 border border-white/10">
            <h2 className="text-sm font-medium text-white mb-4">Detailed Information</h2>
            
            <div className="space-y-4">
              {/* Device Information */}
              <div>
                <h3 className="text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Device</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Type</span>
                    <span className="text-white/80">RadioMaster Pocket</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Model</span>
                    <span className="text-white/80">{remote.model || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">ID</span>
                    <span className="text-white/80 font-mono text-xs">{remote.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {hasMetadata && (
                <div>
                  <h3 className="text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Remote Data</h3>
                  <div className="bg-white/5 rounded-md p-3 border border-white/10">
                    <pre className="text-white/70 text-xs font-mono overflow-auto max-h-48">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!hasMetadata && (
                <div className="text-center py-4">
                  <p className="text-white/40 text-xs">No metadata available</p>
                  <p className="text-white/30 text-xs mt-1">
                    Metadata will appear here when remote is connected and sending data
                  </p>
                </div>
              )}

              {/* Connection Instructions */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Connection Instructions</h3>
                <ol className="space-y-2 text-xs text-white/60 list-decimal list-inside">
                  <li>Connect RadioMaster Pocket to your computer via USB</li>
                  <li>Enable USB Serial (VCP) mode on the transmitter</li>
                  <li>Click "Connect" button above</li>
                  <li>Run the RadioMaster bridge application</li>
                  <li>Remote data will appear in Metadata section</li>
                </ol>
              </div>
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
