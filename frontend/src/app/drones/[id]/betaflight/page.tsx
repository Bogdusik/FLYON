'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FadeIn from '@/components/FadeIn';
import { betaflightAPI } from '@/lib/api';

export default function BetaflightPage() {
  const params = useParams();
  const router = useRouter();
  const droneId = params.id as string;

  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [configHistory, setConfigHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [droneId]);

  const loadData = async () => {
    try {
      setError('');
      const [configRes, historyRes, recRes] = await Promise.allSettled([
        betaflightAPI.getConfig(droneId),
        betaflightAPI.getConfigHistory(droneId),
        betaflightAPI.getRecommendations(droneId),
      ]);

      if (configRes.status === 'fulfilled') {
        setCurrentConfig(configRes.value.data);
      }

      if (historyRes.status === 'fulfilled') {
        setConfigHistory(historyRes.value.data);
      }

      if (recRes.status === 'fulfilled') {
        setRecommendations(recRes.value.data.recommendations || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load Betaflight data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      await betaflightAPI.uploadConfig(droneId, file);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload config');
    } finally {
      setUploading(false);
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link
                href="/drones"
                className="text-white/60 hover:text-white transition-smooth mb-2 inline-block"
              >
                ← Back to Drones
              </Link>
              <h1 className="text-4xl font-bold text-white">Betaflight Configuration</h1>
            </div>
            <label className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer disabled:opacity-50">
              {uploading ? 'Uploading...' : '+ Upload Config'}
              <input
                type="file"
                accept=".diff,.dump"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mb-6 glass-card rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">PID Tuning Recommendations</h2>
              <ul className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-white/80 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">PID Settings</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white/80 text-sm mb-2">Roll</h3>
                    <div className="flex gap-4 text-white">
                      <span>P: {currentConfig.config?.pid?.roll?.p || 'N/A'}</span>
                      <span>I: {currentConfig.config?.pid?.roll?.i || 'N/A'}</span>
                      <span>D: {currentConfig.config?.pid?.roll?.d || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white/80 text-sm mb-2">Pitch</h3>
                    <div className="flex gap-4 text-white">
                      <span>P: {currentConfig.config?.pid?.pitch?.p || 'N/A'}</span>
                      <span>I: {currentConfig.config?.pid?.pitch?.i || 'N/A'}</span>
                      <span>D: {currentConfig.config?.pid?.pitch?.d || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white/80 text-sm mb-2">Yaw</h3>
                    <div className="flex gap-4 text-white">
                      <span>P: {currentConfig.config?.pid?.yaw?.p || 'N/A'}</span>
                      <span>I: {currentConfig.config?.pid?.yaw?.i || 'N/A'}</span>
                      <span>D: {currentConfig.config?.pid?.yaw?.d || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Rates</h2>
                <div className="space-y-2 text-white">
                  <div>Roll: {currentConfig.config?.rates?.roll || 'N/A'}</div>
                  <div>Pitch: {currentConfig.config?.rates?.pitch || 'N/A'}</div>
                  <div>Yaw: {currentConfig.config?.rates?.yaw || 'N/A'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center mb-8">
              <p className="text-white/60 text-lg mb-4">No Betaflight configuration uploaded</p>
              <p className="text-white/40 text-sm">Upload a .diff or .dump file from Betaflight Configurator</p>
            </div>
          )}

          {configHistory.length > 0 && (
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Configuration History</h2>
              <div className="space-y-2">
                {configHistory.map((config, idx) => (
                  <div
                    key={config.id}
                    className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-smooth"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white">
                        Config #{configHistory.length - idx} - {new Date(config.created_at).toLocaleString()}
                      </span>
                      {idx > 0 && (
                        <button
                          onClick={() => {
                            // Compare with previous
                            betaflightAPI.compareConfigs(droneId, config.id, configHistory[idx - 1].id);
                          }}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30"
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FadeIn>
      </main>
    </div>
  );
}
