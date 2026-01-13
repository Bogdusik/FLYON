'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dronesAPI } from '@/lib/api';
import { Drone } from '@/types';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toast';

export default function DronesPage() {
  const router = useRouter();
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrone, setNewDrone] = useState({ name: '', model: '', manufacturer: '' });
  const [showTokenModal, setShowTokenModal] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  useEffect(() => {
    loadDrones();
  }, []);

  const loadDrones = async () => {
    try {
      const response = await dronesAPI.getAll();
      setDrones(response.data);
    } catch (error: any) {
      // Handle rate limiting gracefully - don't crash
      if (error.isRateLimit) {
        console.warn('Rate limit reached, skipping drones update');
        return;
      }
      console.error('Failed to load drones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dronesAPI.create(newDrone);
      setShowAddModal(false);
      setNewDrone({ name: '', model: '', manufacturer: '' });
      toast.success('Drone created successfully!');
      loadDrones();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create drone');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this drone?')) return;
    
    // Optimistic update - remove from UI immediately
    const droneToDelete = drones.find(d => d.id === id);
    setDrones(prev => prev.filter(d => d.id !== id));
    
    try {
      await dronesAPI.delete(id);
      toast.success('Drone deleted successfully!');
    } catch (error: any) {
      // Rollback on error
      if (droneToDelete) {
        setDrones(prev => [...prev, droneToDelete]);
      }
      toast.error(error.response?.data?.error || 'Failed to delete drone');
    }
  };

  const handleCopyToken = async (token: string, droneId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedTokenId(droneId);
      toast.success('Device token copied to clipboard!');
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = token;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedTokenId(droneId);
      toast.success('Device token copied to clipboard!');
      setTimeout(() => setCopiedTokenId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <SkeletonList />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-medium text-white">Drones</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-dji btn-dji-sm"
          >
            Add Drone
          </button>
        </div>

        {drones.length === 0 ? (
          <div className="glass-card rounded-lg p-4 text-center border border-white/10">
            <p className="text-white/60 mb-3 text-sm">No drones registered yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-dji btn-dji-sm"
            >
              Add Your First Drone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {drones.map((drone) => (
              <div key={drone.id} className="glass-card rounded-lg p-3 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-1">{drone.name}</h3>
                {drone.model && <p className="text-white/70 text-xs mb-0.5">Model: {drone.model}</p>}
                {drone.manufacturer && <p className="text-white/70 text-xs mb-3">Manufacturer: {drone.manufacturer}</p>}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-2">Device Token:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs glass rounded px-2 py-1 text-white/80 font-mono">
                      {drone.device_token.slice(0, 8)}...
                    </code>
                    <button
                      onClick={() => handleCopyToken(drone.device_token, drone.id)}
                      className="btn-dji btn-dji-sm text-xs whitespace-nowrap"
                      title="Copy full token"
                    >
                      {copiedTokenId === drone.id ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setShowTokenModal(drone.id)}
                      className="btn-dji btn-dji-sm text-xs whitespace-nowrap"
                      title="View full token"
                    >
                      Show
                    </button>
                    <Link
                      href={`/drones/${drone.id}/betaflight`}
                      className="btn-dji btn-dji-sm text-xs whitespace-nowrap inline-block text-center"
                    >
                      Betaflight
                    </Link>
                    <button
                      onClick={() => handleDelete(drone.id)}
                      className="btn-dji btn-dji-sm text-xs whitespace-nowrap"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        color: 'rgba(239, 68, 68, 0.9)',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-medium mb-4 text-white">Add New Drone</h2>
              <form onSubmit={handleAddDrone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newDrone.name}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 255);
                      setNewDrone({ ...newDrone, name: value });
                    }}
                    required
                    maxLength={255}
                    className="input-dji w-full"
                    placeholder="Enter drone name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={newDrone.model}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 255);
                      setNewDrone({ ...newDrone, model: value });
                    }}
                    maxLength={255}
                    className="input-dji w-full"
                    placeholder="Enter model"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={newDrone.manufacturer}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 255);
                      setNewDrone({ ...newDrone, manufacturer: value });
                    }}
                    maxLength={255}
                    className="input-dji w-full"
                    placeholder="Enter manufacturer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-dji btn-dji-sm flex-1"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-dji btn-dji-sm flex-1 opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showTokenModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-lg p-5 max-w-xl w-full">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-medium text-white">Device Token</h2>
                <button
                  onClick={() => setShowTokenModal(null)}
                  className="text-white/70 hover:text-white transition-smooth"
                >
                  ✕
                </button>
              </div>
              {drones.find(d => d.id === showTokenModal) && (
                <>
                  <p className="text-white/70 mb-4 text-sm">
                    Use this token to authenticate telemetry requests. Keep it secure!
                  </p>
                  <div className="glass rounded-lg p-4 mb-4">
                    <code className="text-sm text-white/90 break-all block font-mono">
                      {drones.find(d => d.id === showTokenModal)!.device_token}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const token = drones.find(d => d.id === showTokenModal)!.device_token;
                        handleCopyToken(token, showTokenModal);
                      }}
                      className="btn-dji btn-dji-sm flex-1"
                    >
                      {copiedTokenId === showTokenModal ? '✓ Copied!' : 'Copy Token'}
                    </button>
                    <button
                      onClick={() => setShowTokenModal(null)}
                      className="btn-dji btn-dji-sm"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
