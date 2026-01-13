'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { dangerZonesAPI } from '@/lib/api';
import { DangerZone } from '@/types';
import Navbar from '@/components/Navbar';

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
      <Navbar />

      <main className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-medium text-white">Danger Zones</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-dji btn-dji-sm"
          >
            Add Zone
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="glass-card rounded-lg p-4 text-center border border-white/10">
            <p className="text-white/60 mb-3 text-sm">No danger zones defined yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-dji btn-dji-sm"
            >
              Add Zone
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="glass-card rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">{zone.name}</h3>
                    {zone.description && (
                      <p className="text-white/70 text-xs mt-0.5">{zone.description}</p>
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
                        className="btn-dji btn-dji-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          color: 'rgba(252, 165, 165, 0.9)',
                        }}
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
            <div className="glass-strong rounded-lg p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-medium mb-4 text-white">Add Danger Zone</h2>
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
                    className="input-dji w-full"
                    placeholder="Zone name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newZone.description}
                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                    className="input-dji w-full"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Zone Type
                  </label>
                  <select
                    value={newZone.zone_type}
                    onChange={(e) => setNewZone({ ...newZone, zone_type: e.target.value as any })}
                    className="input-dji w-full pr-10 appearance-none cursor-pointer"
                  >
                    <option value="user" style={{ backgroundColor: '#0f172a' }}>User</option>
                    <option value="community" style={{ backgroundColor: '#0f172a' }}>Community</option>
                    <option value="airport" style={{ backgroundColor: '#0f172a' }}>Airport</option>
                    <option value="restricted" style={{ backgroundColor: '#0f172a' }}>Restricted</option>
                  </select>
                  <div className="absolute right-3 top-9 pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Altitude Limit (meters, optional)
                  </label>
                  <input
                    type="number"
                    value={newZone.altitude_limit_meters}
                    onChange={(e) => setNewZone({ ...newZone, altitude_limit_meters: e.target.value })}
                    className="input-dji w-full"
                    placeholder="Optional"
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
                    className="input-dji w-full font-mono text-sm"
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
                    className="btn-dji btn-dji-sm flex-1"
                  >
                    Add Zone
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
      </main>
    </div>
  );
}
