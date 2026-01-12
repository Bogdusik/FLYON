'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dronesAPI } from '@/lib/api';
import { Drone } from '@/types';

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
    } catch (error) {
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
      loadDrones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create drone');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this drone?')) return;
    try {
      await dronesAPI.delete(id);
      loadDrones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete drone');
    }
  };

  const handleCopyToken = async (token: string, droneId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedTokenId(droneId);
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
      setTimeout(() => setCopiedTokenId(null), 2000);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="text-2xl font-bold gradient-text">FLYON</Link>
            <div className="flex gap-6">
              <Link href="/dashboard" className="text-white/90 hover:text-white transition-smooth relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/drones" className="text-white font-semibold relative group">
                Drones
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-400"></span>
              </Link>
              <Link href="/flights" className="text-white/90 hover:text-white transition-smooth relative group">
                Flights
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">My Drones</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Add Drone
          </button>
        </div>

        {drones.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-white/70 mb-6 text-lg">No drones registered yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Add Your First Drone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drones.map((drone) => (
              <div key={drone.id} className="glass-card rounded-xl p-6 hover-lift">
                <h3 className="text-xl font-semibold text-white mb-2">{drone.name}</h3>
                {drone.model && <p className="text-white/70 mb-1">Model: {drone.model}</p>}
                {drone.manufacturer && <p className="text-white/70 mb-4">Manufacturer: {drone.manufacturer}</p>}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-2">Device Token:</p>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs glass rounded p-2 flex-1 break-all text-white/80">
                      {drone.device_token.slice(0, 40)}...
                    </code>
                    <button
                      onClick={() => handleCopyToken(drone.device_token, drone.id)}
                      className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-smooth whitespace-nowrap"
                      title="Copy full token"
                    >
                      {copiedTokenId === drone.id ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setShowTokenModal(drone.id)}
                      className="px-3 py-1 text-xs glass text-white/80 rounded-lg hover:bg-white/10 transition-smooth whitespace-nowrap"
                      title="View full token"
                    >
                      Show
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleDelete(drone.id)}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-smooth"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4 text-white">Add New Drone</h2>
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
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
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
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
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
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                    placeholder="Enter manufacturer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 glass text-white/90 rounded-lg hover:bg-white/10 transition-smooth"
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
            <div className="glass-strong rounded-xl p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Device Token</h2>
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
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      {copiedTokenId === showTokenModal ? '✓ Copied!' : 'Copy Token'}
                    </button>
                    <button
                      onClick={() => setShowTokenModal(null)}
                      className="px-4 py-2 glass text-white/90 rounded-lg hover:bg-white/10 transition-smooth"
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
