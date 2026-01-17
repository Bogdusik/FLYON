'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { remotesAPI } from '@/lib/api';
import { Remote } from '@/types';
import { toast } from '@/components/Toast';

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
      // Handle rate limiting gracefully - don't show error, just skip this update
      if (err.isRateLimit) {
        console.warn('Rate limit reached, skipping remotes update');
        return; // Don't update error state, just skip silently
      }
      const errorMsg = err.response?.data?.error || 'Failed to load remotes';
      setError(errorMsg);
      console.error('Failed to load remotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRadioMaster = async (existingRemote?: Remote) => {
    setConnecting(true);
    setError('');
    try {
      if (existingRemote) {
        // Reconnect existing remote
        await remotesAPI.updateStatus(existingRemote.id, 'connecting');
        toast.info('Connection initiated. Make sure the RadioMaster bridge application is running.');
        setShowRadioMasterModal(false);
      } else {
        // Connect new remote
        const response = await remotesAPI.connectRadioMaster({ name: radiomasterName });
        toast.success('Remote created successfully! Make sure the RadioMaster bridge application is running to complete the connection.');
        setShowRadioMasterModal(false);
        setRadioMasterName('RadioMaster Pocket'); // Reset
      }
      await loadRemotes();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to connect RadioMaster remote';
      setError(errorMsg);
      toast.error(errorMsg);
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
      <main className="container mx-auto px-6 py-4">
        <FadeIn>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-medium text-white">RadioMaster Pocket</h1>
            <button
              onClick={() => setShowRadioMasterModal(true)}
              disabled={connecting}
              className="btn-dji btn-dji-sm"
            >
              Connect
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg flex justify-between items-center text-sm">
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mb-3"></div>
                <div className="text-sm text-white/70">Loading...</div>
              </div>
            </div>
          ) : remotes.length === 0 ? (
            <div className="glass-card rounded-lg p-4 text-center border border-white/10">
              <p className="text-white/60 text-sm mb-2">No remotes connected</p>
              <p className="text-white/40 text-xs">Connect a RadioMaster Pocket transmitter to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {remotes.map((remote) => (
                <FadeIn key={remote.id}>
                  <div className="glass-card rounded-lg p-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-0.5">
                          {remote.name}
                        </h3>
                        <p className="text-white/50 text-xs">
                          {remote.model || 'RadioMaster Pocket'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-normal ${
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

                    {remote.last_connected && (
                      <p className="text-white/40 text-xs mb-2">
                        {new Date(remote.last_connected).toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {remote.status === 'connected' ? (
                        <button
                          onClick={() => handleDisconnect(remote.id)}
                          disabled={connecting || disconnecting === remote.id}
                          className="btn-dji btn-dji-sm flex-1 flex items-center justify-center gap-1.5"
                        >
                          {disconnecting === remote.id ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-3 w-3 border border-white/30 border-t-transparent"></div>
                              Disconnecting
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectRadioMaster(remote)}
                          disabled={connecting || disconnecting === remote.id}
                          className="btn-dji btn-dji-sm flex-1 flex items-center justify-center gap-1.5"
                        >
                          {connecting ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-3 w-3 border border-white/30 border-t-transparent"></div>
                              Connecting
                            </>
                          ) : (
                            'Connect'
                          )}
                        </button>
                      )}
                      <Link
                        href={`/remotes/${remote.id}`}
                        className="btn-dji btn-dji-sm flex-1 text-center opacity-70"
                      >
                        Details
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
            <div className="glass-card rounded-lg p-5 max-w-sm w-full mx-4">
              <h2 className="text-lg font-medium text-white mb-3">Connect RadioMaster</h2>
              <p className="text-white/60 text-sm mb-4">
                Connect via USB. Ensure USB Serial (VCP) mode is enabled.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-normal text-white/70 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={radiomasterName}
                    onChange={(e) => setRadioMasterName(e.target.value)}
                    placeholder="RadioMaster Pocket"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleConnectRadioMaster}
                    disabled={connecting}
                    className="btn-dji btn-dji-sm flex-1"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => setShowRadioMasterModal(false)}
                    className="btn-dji btn-dji-sm opacity-70"
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
