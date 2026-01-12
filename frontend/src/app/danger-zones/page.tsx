'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { dangerZonesAPI } from '@/lib/api';
import { DangerZone } from '@/types';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false });

export default function DangerZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    zone_type: 'user' as 'user' | 'community' | 'airport' | 'restricted',
    coordinates: [] as Array<{ lat: number; lon: number }>,
    altitude_limit_meters: '',
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      const response = await dangerZonesAPI.getAll();
      setZones(response.data);
    } catch (error) {
      console.error('Failed to load danger zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newZone.coordinates.length < 4) {
      alert('Please provide at least 4 coordinates for the polygon');
      return;
    }

    try {
      await dangerZonesAPI.create({
        name: newZone.name,
        description: newZone.description,
        zone_type: newZone.zone_type,
        coordinates: newZone.coordinates,
        altitude_limit_meters: newZone.altitude_limit_meters ? parseFloat(newZone.altitude_limit_meters) : undefined,
      });
      setShowAddModal(false);
      setNewZone({
        name: '',
        description: '',
        zone_type: 'user',
        coordinates: [],
        altitude_limit_meters: '',
      });
      loadZones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create danger zone');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this danger zone?')) return;
    try {
      await dangerZonesAPI.delete(id);
      loadZones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete danger zone');
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
              <Link href="/drones" className="text-white/90 hover:text-white transition-smooth relative group">
                Drones
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
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
          <h1 className="text-4xl font-bold text-white">Danger Zones</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Add Danger Zone
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-white/70 mb-6 text-lg">No danger zones defined yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Add Your First Danger Zone
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="glass-card rounded-xl p-6 hover-lift">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{zone.name}</h3>
                    {zone.description && (
                      <p className="text-white/70 mt-1">{zone.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      zone.zone_type === 'restricted' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      zone.zone_type === 'airport' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                      zone.zone_type === 'community' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      'bg-white/10 text-white/70 border-white/20'
                    }`}>
                      {zone.zone_type}
                    </span>
                    {zone.user_id && (
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="px-3 py-1 text-sm bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-smooth"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {zone.altitude_limit_meters && (
                  <p className="text-sm text-white/60">
                    Altitude limit: {zone.altitude_limit_meters} m
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-white">Add Danger Zone</h2>
              <form onSubmit={handleAddZone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newZone.description}
                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Zone Type
                  </label>
                  <select
                    value={newZone.zone_type}
                    onChange={(e) => setNewZone({ ...newZone, zone_type: e.target.value as any })}
                    className="w-full px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                  >
                    <option value="user">User</option>
                    <option value="community">Community</option>
                    <option value="airport">Airport</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Altitude Limit (meters, optional)
                  </label>
                  <input
                    type="number"
                    value={newZone.altitude_limit_meters}
                    onChange={(e) => setNewZone({ ...newZone, altitude_limit_meters: e.target.value })}
                    className="w-full px-4 py-2 glass rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Coordinates (JSON array of {lat, lon} objects)
                  </label>
                  <textarea
                    value={JSON.stringify(newZone.coordinates, null, 2)}
                    onChange={(e) => {
                      try {
                        const coords = JSON.parse(e.target.value);
                        setNewZone({ ...newZone, coordinates: coords });
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full px-4 py-2 glass rounded-lg font-mono text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
                    rows={6}
                    placeholder='[{"lat": 51.505, "lon": -0.09}, {"lat": 51.506, "lon": -0.10}, ...]'
                  />
                  <p className="mt-1 text-xs text-white/50">
                    Provide at least 4 coordinates to form a polygon
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    Add Zone
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
      </main>
    </div>
  );
}
