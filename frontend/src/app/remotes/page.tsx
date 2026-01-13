'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { remotesAPI } from '@/lib/api';
import { Remote } from '@/types';

export default function RemotesPage() {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRadioMasterModal, setShowRadioMasterModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [radiomasterName, setRadioMasterName] = useState('RadioMaster Pocket');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    loadRemotes();
  }, [refreshTick]);

  // simple polling to keep statuses fresh
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const loadRemotes = async () => {
    try {
      setError(''); // Clear previous errors
      const response = await remotesAPI.getAll();
      setRemotes(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load remotes';
      setError(errorMsg);
      console.error('Failed to load remotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRadioMaster = async () => {
    setConnecting(true);
    setError('');
    try {
      await remotesAPI.connectRadioMaster({ name: radiomasterName });
      setShowRadioMasterModal(false);
      setRadioMasterName('RadioMaster Pocket'); // Reset
      await loadRemotes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect RadioMaster remote');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setDisconnecting(id);
    setError('');
    
    // Optimistic update - immediately update UI
    setRemotes(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'disconnected' as const } : r
    ));
    
    try {
      await remotesAPI.disconnect(id);
      // Reload to get fresh data
      await loadRemotes();
    } catch (err: any) {
      // Revert optimistic update on error
      await loadRemotes();
      setError(err.response?.data?.error || 'Failed to disconnect remote');
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <FadeIn>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">RadioMaster Pocket Transmitter</h1>
            <button
              onClick={() => setShowRadioMasterModal(true)}
              disabled={connecting}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              + Connect RadioMaster Pocket
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-4 text-red-300 hover:text-red-200 transition-colors"
                aria-label="Close error"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
                <div className="text-xl text-white">Loading...</div>
              </div>
            </div>
          ) : remotes.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-white/60 text-lg mb-4">No remotes connected</p>
              <p className="text-white/40 text-sm">Connect a RadioMaster Pocket transmitter to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {remotes.map((remote) => (
                <FadeIn key={remote.id}>
                  <div className="glass-card rounded-xl p-6 hover-lift">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {remote.name}
                        </h3>
                        <p className="text-white/60 text-sm">
                          RadioMaster Pocket {remote.model && ` • ${remote.model}`}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          remote.status === 'connected'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : remote.status === 'connecting'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-white/10 text-white/70 border border-white/20'
                        }`}
                      >
                        {remote.status}
                      </span>
                    </div>

                    {remote.last_connected && (
                      <p className="text-white/50 text-xs mb-4">
                        Last connected: {new Date(remote.last_connected).toLocaleString()}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDisconnect(remote.id)}
                        disabled={connecting || disconnecting === remote.id}
                        className="flex-1 px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {disconnecting === remote.id ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-red-300 border-t-transparent"></div>
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </button>
                      <Link
                        href={`/remotes/${remote.id}`}
                        className="flex-1 px-4 py-2 text-center bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </FadeIn>

        {/* RadioMaster Connection Modal */}
        {showRadioMasterModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRadioMasterModal(false);
              }
            }}
          >
            <div className="glass-card rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">Connect RadioMaster Pocket</h2>
              <p className="text-white/70 mb-6">
                Connect your RadioMaster Pocket via USB. Make sure the transmitter is in USB Serial (VCP) mode.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Remote Name
                  </label>
                  <input
                    type="text"
                    value={radiomasterName}
                    onChange={(e) => setRadioMasterName(e.target.value)}
                    placeholder="RadioMaster Pocket"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleConnectRadioMaster}
                    disabled={connecting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 transition-all"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => setShowRadioMasterModal(false)}
                    className="px-4 py-3 glass text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
