'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { flightsAPI, analyticsAPI, exportAPI, sharingAPI, advancedAnalyticsAPI } from '@/lib/api';
import { Flight, Telemetry, HealthScore } from '@/types';
import { getWebSocketClient } from '@/lib/websocket';
import TelemetryGraphs from '@/components/TelemetryGraphs';
import { showDangerZoneWarning, requestNotificationPermission } from '@/utils/notifications';
import { parsePosition } from '@/utils/position';
import Navbar from '@/components/Navbar';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false });

// Maximum telemetry points to keep in memory (prevent memory leaks)
const MAX_TELEMETRY_POINTS = 10000;

export default function FlightDetailPage() {
  const params = useParams();
  const flightId = params.id as string;

  const [flight, setFlight] = useState<Flight | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [statsCalculating, setStatsCalculating] = useState(false);
  const [statsStartTime, setStatsStartTime] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [advancedMetrics, setAdvancedMetrics] = useState<any>(null);
  const wsClientRef = useRef<any>(null);
  const telemetryHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());
  const statsPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadFlightData = useCallback(async () => {
    try {
      const [flightRes, telemetryRes] = await Promise.all([
        flightsAPI.getById(flightId),
        flightsAPI.getTelemetry(flightId, { limit: 1000 }),
      ]);

      const flightData = flightRes.data;
      setFlight(flightData);
      // Only update telemetry if we don't have WebSocket updates (for completed flights)
      if (flightData.status !== 'active' || !wsClientRef.current) {
        setTelemetry(telemetryRes.data);
      }
      setIsLive(flightData.status === 'active');

      // Check if statistics need to be calculated
      // Check for null/undefined values properly
      const hasStats = flightData.total_distance_meters != null || 
                       flightData.max_altitude_meters != null || 
                       flightData.max_speed_mps != null || 
                       flightData.min_battery_percent != null;
      
      const needsStats = flightData.status === 'completed' && !hasStats;
      
      if (needsStats) {
        // Start calculation if not already calculating
        if (!statsCalculating) {
          setStatsCalculating(true);
          setStatsStartTime(Date.now());
          // Trigger recalculation - backend will also auto-calculate on GET, but this ensures it
          flightsAPI.recalculateStats(flightId).catch((error) => {
            console.error('Failed to trigger stats calculation:', error);
            // Don't reset immediately - let polling handle it
          });
        }
      } else if (hasStats && statsCalculating) {
        // Stats are now available, stop calculating
        setStatsCalculating(false);
        setStatsStartTime(null);
      }

      // Calculate health score if flight is completed
      if (flightData.status === 'completed' && !flightData.health_score) {
        try {
          const scoreRes = await analyticsAPI.calculateHealthScore(flightId);
          setHealthScore(scoreRes.data);
        } catch (error) {
          console.error('Failed to calculate health score:', error);
        }
      } else if (flightData.health_score) {
        setHealthScore(flightData.health_score);
      }

      // Load advanced metrics
      try {
        const metricsRes = await advancedAnalyticsAPI.getAdvancedMetrics(flightId);
        setAdvancedMetrics(metricsRes.data);
      } catch (err) {
        // Advanced metrics are optional
        console.log('Advanced metrics not available');
      }
    } catch (error) {
      console.error('Failed to load flight data:', error);
    } finally {
      setLoading(false);
    }
  }, [flightId]);

  const cleanupWebSocket = useCallback(() => {
    if (wsClientRef.current) {
      // Remove all handlers
      telemetryHandlersRef.current.forEach((handler, type) => {
        wsClientRef.current.off(type, handler);
      });
      telemetryHandlersRef.current.clear();
      
      // Unsubscribe from flight
      if (flightId) {
        wsClientRef.current.unsubscribe(flightId);
      }
      
      wsClientRef.current = null;
    }
  }, [flightId]);

  const setupWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !flight) return;

    const ws = getWebSocketClient(token);
    wsClientRef.current = ws;
    
    ws.connect().then(() => {
      ws.subscribe(flightId);
      
      // Telemetry handler with memory limit
      const telemetryHandler = (message: any) => {
        if (message.flight_id === flightId) {
          // Add new telemetry point with memory limit
          const newPoint = {
            id: message.data.id,
            flight_id: flightId,
            drone_id: flight.drone_id,
            timestamp: message.data.timestamp,
            position: `POINT(${message.data.longitude} ${message.data.latitude})`,
            altitude_meters: message.data.altitude,
            speed_mps: message.data.speed,
            heading_degrees: message.data.heading,
            battery_percent: message.data.battery,
            flight_mode: message.data.flight_mode,
            is_armed: message.data.is_armed,
            raw_data: {},
            created_at: message.data.timestamp,
          };
          
          setTelemetry(prev => {
            const updated = [...prev, newPoint];
            // Keep only last MAX_TELEMETRY_POINTS to prevent memory issues
            if (updated.length > MAX_TELEMETRY_POINTS) {
              return updated.slice(-MAX_TELEMETRY_POINTS);
            }
            return updated;
          });
        }
      };

      // Warning handler
      const warningHandler = (message: any) => {
        showDangerZoneWarning(message.data.message || 'Danger zone warning');
      };

      // Flight update handler (for status changes, etc.)
      const flightUpdateHandler = (message: any) => {
        if (message.flight_id === flightId && message.data) {
          setFlight(prev => prev ? { ...prev, ...message.data } : null);
          
          // If flight completed, reload data to get final stats
          if (message.data.status === 'completed') {
            setIsLive(false);
            // Reload to get final telemetry and stats
            loadFlightData();
          }
        }
      };

      // Store handlers for cleanup
      telemetryHandlersRef.current.set('telemetry', telemetryHandler);
      telemetryHandlersRef.current.set('warning', warningHandler);
      telemetryHandlersRef.current.set('flight_update', flightUpdateHandler);

      ws.on('telemetry', telemetryHandler);
      ws.on('warning', warningHandler);
      ws.on('flight_update', flightUpdateHandler);
    }).catch((error) => {
      console.error('WebSocket connection failed:', error);
    });
  }, [flightId, flight, loadFlightData]);

  useEffect(() => {
    loadFlightData();
    
    // Request notification permission
    requestNotificationPermission();
  }, [loadFlightData]);

  useEffect(() => {
    // Setup WebSocket when flight is loaded and active
    if (flight?.status === 'active') {
      setupWebSocket();
      
      // Only poll if WebSocket is not available (fallback)
      // WebSocket handles real-time updates, polling is just a backup
      const pollInterval = setInterval(() => {
        // Only poll if WebSocket is not connected
        if (!wsClientRef.current || wsClientRef.current.ws?.readyState !== WebSocket.OPEN) {
          loadFlightData();
        }
      }, 10000); // Reduced frequency to 10 seconds (WebSocket is primary)

      return () => {
        clearInterval(pollInterval);
        // Cleanup WebSocket handlers and disconnect
        cleanupWebSocket();
      };
    } else {
      // Cleanup WebSocket if flight is not active
      cleanupWebSocket();
    }
  }, [flight, setupWebSocket, cleanupWebSocket, loadFlightData]);

  // Poll for statistics updates if calculating
  useEffect(() => {
    if (statsCalculating && flight?.status === 'completed') {
      // Clear any existing interval
      if (statsPollIntervalRef.current) {
        clearInterval(statsPollIntervalRef.current);
      }
      
      // Start polling immediately, then every 2 seconds
      const pollStats = async () => {
        try {
          const flightRes = await flightsAPI.getById(flightId);
          const flightData = flightRes.data;
          
          // Check if stats are now available (properly check for null/undefined)
          const hasStats = flightData.total_distance_meters != null || 
                           flightData.max_altitude_meters != null || 
                           flightData.max_speed_mps != null || 
                           flightData.min_battery_percent != null;
          
          if (hasStats) {
            setStatsCalculating(false);
            setStatsStartTime(null);
            setFlight(flightData);
            if (statsPollIntervalRef.current) {
              clearInterval(statsPollIntervalRef.current);
              statsPollIntervalRef.current = null;
            }
          } else if (statsStartTime && Date.now() - statsStartTime > 30000) {
            // Stop polling after 30 seconds to avoid infinite polling
            console.warn('Stats calculation taking too long, stopping poll');
            setStatsCalculating(false);
            setStatsStartTime(null);
            if (statsPollIntervalRef.current) {
              clearInterval(statsPollIntervalRef.current);
              statsPollIntervalRef.current = null;
            }
          }
        } catch (error) {
          console.error('Failed to poll for stats:', error);
        }
      };
      
      // Poll immediately
      pollStats();
      
      // Then poll every 2 seconds
      statsPollIntervalRef.current = setInterval(pollStats, 2000);
    } else {
      // Clear interval if not calculating
      if (statsPollIntervalRef.current) {
        clearInterval(statsPollIntervalRef.current);
        statsPollIntervalRef.current = null;
      }
    }
    
    return () => {
      if (statsPollIntervalRef.current) {
        clearInterval(statsPollIntervalRef.current);
        statsPollIntervalRef.current = null;
      }
    };
  }, [statsCalculating, flight?.status, flightId, statsStartTime]);

  // Memoize telemetry points transformation for performance
  // IMPORTANT: All hooks must be called before any conditional returns
  const telemetryPoints = useMemo(() => {
    return telemetry.map(t => {
      const pos = parsePosition(t.position);
      if (!pos) {
        console.warn('Failed to parse position:', t.position);
        return null;
      }
      
      // Ensure numeric values (handle null/undefined)
      const altitude = t.altitude_meters != null ? Number(t.altitude_meters) : null;
      const speed = t.speed_mps != null ? Number(t.speed_mps) : null;
      const battery = t.battery_percent != null ? Number(t.battery_percent) : null;
      
      return {
        latitude: pos.lat,
        longitude: pos.lon,
        altitude: altitude,
        speed: speed,
        battery: battery,
        timestamp: t.timestamp,
      };
    }).filter(Boolean) as any[];
  }, [telemetry]);

  const center = useMemo(() => {
    return telemetryPoints.length > 0
      ? [telemetryPoints[0].latitude, telemetryPoints[0].longitude] as [number, number]
      : undefined;
  }, [telemetryPoints]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!flight) {
    return <div className="min-h-screen flex items-center justify-center text-white">Flight not found</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/flights" className="text-blue-400 hover:text-blue-300 transition-smooth mb-2 inline-block">
            ← Back to Flights
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">Flight Details</h1>
                {isLive && flight.status === 'active' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-emerald-300">LIVE</span>
                  </div>
                )}
              </div>
              <p className="text-white/70">Session: {flight.session_id}</p>
              {telemetry.length > 0 && (
                <p className="text-white/60 text-sm mt-1">
                  {telemetry.length} telemetry point{telemetry.length !== 1 ? 's' : ''} recorded
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {flight.status === 'active' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const confirmed = window.confirm('Complete this flight? This will mark it as finished.');
                    if (!confirmed) return;
                    
                    (async () => {
                      try {
                        await flightsAPI.update(flightId, {
                          status: 'completed',
                          ended_at: new Date().toISOString(),
                        });
                        await loadFlightData();
                      } catch (err: any) {
                        alert(err.response?.data?.error || 'Failed to complete flight');
                      }
                    })();
                  }}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-smooth cursor-pointer"
                >
                  Complete Flight
                </button>
              )}
              <button
                onClick={async () => {
                  try {
                    const response = await exportAPI.exportFlightKML(flightId);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `flight-${flightId}.kml`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Failed to export KML');
                  }
                }}
                className="px-4 py-2 glass text-white/90 rounded-lg hover:bg-white/10 transition-smooth"
              >
                Export KML
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await exportAPI.exportFlightGPX(flightId);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `flight-${flightId}.gpx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Failed to export GPX');
                  }
                }}
                className="px-4 py-2 glass text-white/90 rounded-lg hover:bg-white/10 transition-smooth"
              >
                Export GPX
              </button>
              <button
                onClick={async () => {
                  if (shareLink) {
                    navigator.clipboard.writeText(`${window.location.origin}${shareLink}`);
                    alert('Share link copied to clipboard!');
                    return;
                  }
                  setSharing(true);
                  try {
                    const res = await sharingAPI.createFlightShare(flightId);
                    const fullUrl = `${window.location.origin}${res.data.share_url}`;
                    setShareLink(res.data.share_url);
                    navigator.clipboard.writeText(fullUrl);
                    alert('Share link created and copied to clipboard!');
                  } catch (err: any) {
                    alert(err.response?.data?.error || 'Failed to create share link');
                  } finally {
                    setSharing(false);
                  }
                }}
                disabled={sharing}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {sharing ? 'Sharing...' : shareLink ? 'Copy Share Link' : 'Share Flight'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="glass-card rounded-xl p-6 hover-lift">
            <h3 className="text-lg font-semibold mb-4 text-white">Flight Info</h3>
            <div className="space-y-2 text-sm text-white/90">
              <p><span className="font-medium">Status:</span> <span className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                flight.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                flight.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-white/10 text-white/70 border border-white/20'
              }`}>{flight.status}</span></p>
              <p><span className="font-medium">Started:</span> {new Date(flight.started_at).toLocaleString()}</p>
              {flight.ended_at && <p><span className="font-medium">Ended:</span> {new Date(flight.ended_at).toLocaleString()}</p>}
              {flight.duration_seconds && (
                <p><span className="font-medium">Duration:</span> {Math.floor(flight.duration_seconds / 60)}m {flight.duration_seconds % 60}s</p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 hover-lift">
            <h3 className="text-lg font-semibold mb-4 text-white">Statistics</h3>
            {statsCalculating && statsStartTime && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="loading-spinner w-4 h-4"></div>
                  <span className="text-sm text-blue-300 font-medium">Calculating statistics...</span>
                </div>
                <p className="text-xs text-white/60">
                  Estimated time: {Math.max(1, Math.ceil((Date.now() - statsStartTime) / 1000))}s
                  {telemetry.length > 100 && ` (processing ${telemetry.length} points)`}
                </p>
              </div>
            )}
            <div className="space-y-2 text-sm text-white/90">
              {flight.total_distance_meters != null && !isNaN(Number(flight.total_distance_meters)) ? (
                <p><span className="font-medium">Distance:</span> {(Number(flight.total_distance_meters) / 1000).toFixed(2)} km</p>
              ) : (
                <p className="text-white/50 flex items-center gap-2">
                  <span>Distance:</span>
                  {statsCalculating ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="loading-spinner w-3 h-3"></span>
                      Calculating...
                    </span>
                  ) : (
                    <span>Calculating...</span>
                  )}
                </p>
              )}
              {flight.max_altitude_meters != null && !isNaN(Number(flight.max_altitude_meters)) ? (
                <p><span className="font-medium">Max Altitude:</span> {Number(flight.max_altitude_meters).toFixed(1)} m</p>
              ) : (
                <p className="text-white/50 flex items-center gap-2">
                  <span>Max Altitude:</span>
                  {statsCalculating ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="loading-spinner w-3 h-3"></span>
                      Calculating...
                    </span>
                  ) : (
                    <span>Calculating...</span>
                  )}
                </p>
              )}
              {flight.max_speed_mps != null && !isNaN(Number(flight.max_speed_mps)) ? (
                <p><span className="font-medium">Max Speed:</span> {Number(flight.max_speed_mps).toFixed(1)} m/s</p>
              ) : (
                <p className="text-white/50 flex items-center gap-2">
                  <span>Max Speed:</span>
                  {statsCalculating ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="loading-spinner w-3 h-3"></span>
                      Calculating...
                    </span>
                  ) : (
                    <span>Calculating...</span>
                  )}
                </p>
              )}
              {flight.min_battery_percent != null && !isNaN(Number(flight.min_battery_percent)) ? (
                <p><span className="font-medium">Min Battery:</span> {Number(flight.min_battery_percent).toFixed(1)}%</p>
              ) : (
                <p className="text-white/50 flex items-center gap-2">
                  <span>Min Battery:</span>
                  {statsCalculating ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="loading-spinner w-3 h-3"></span>
                      Calculating...
                    </span>
                  ) : (
                    <span>Calculating...</span>
                  )}
                </p>
              )}
              {!statsCalculating && !flight.total_distance_meters && !flight.max_altitude_meters && !flight.max_speed_mps && !flight.min_battery_percent && flight.status === 'completed' && (
                <p className="text-white/50 italic text-xs mt-2">Statistics calculation will start automatically...</p>
              )}
            </div>
          </div>

          {healthScore && (
            <div className="glass-card rounded-xl p-6 hover-lift group">
              <h3 className="text-lg font-semibold mb-4 text-white">Health Score</h3>
              <div className="space-y-2 text-sm text-white/90">
                <p className="flex items-center">
                  <span className="font-medium">Overall:</span> 
                  <span className="text-2xl font-bold gradient-text ml-2 inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">{healthScore.overall}/100</span>
                </p>
                <p><span className="font-medium">Safety:</span> {healthScore.safety}/100</p>
                <p><span className="font-medium">Smoothness:</span> {healthScore.smoothness}/100</p>
                <p><span className="font-medium">Battery Efficiency:</span> {healthScore.battery_efficiency}/100</p>
                <p><span className="font-medium">Risk Exposure:</span> {healthScore.risk_exposure}/100</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Flight Path</h2>
            {isLive && flight.status === 'active' && telemetry.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>Receiving live updates...</span>
              </div>
            )}
          </div>
          <div className="h-[500px] w-full rounded-lg overflow-hidden border border-white/10">
            {telemetryPoints.length > 0 ? (
              <LiveMap 
                key={`map-${telemetryPoints.length}`}
                telemetry={telemetryPoints} 
                center={center} 
                showPath={true}
                followDrone={isLive && flight.status === 'active'}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/60">
                No telemetry data available. Send telemetry to see the flight path.
              </div>
            )}
          </div>
          {telemetryPoints.length > 0 && (() => {
            const latest = telemetryPoints[telemetryPoints.length - 1];
            // Handle null values properly
            const altitude = latest.altitude != null && !isNaN(Number(latest.altitude)) ? Number(latest.altitude) : null;
            const speed = latest.speed != null && !isNaN(Number(latest.speed)) ? Number(latest.speed) : null;
            const battery = latest.battery != null && !isNaN(Number(latest.battery)) ? Number(latest.battery) : null;
            
            return (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-4 border border-blue-500/30 group hover:border-blue-500/50 transition-all">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Altitude</p>
                  <p className="text-2xl font-bold text-blue-400 inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">
                    {altitude !== null ? `${altitude.toFixed(1)} m` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Max: {Math.max(...telemetryPoints.map(t => typeof t.altitude === 'number' && !isNaN(t.altitude) ? t.altitude : 0)).toFixed(1)} m
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-purple-500/30 group hover:border-purple-500/50 transition-all">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Speed</p>
                  <p className="text-2xl font-bold text-purple-400 inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">
                    {speed !== null ? `${speed.toFixed(1)} m/s` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Max: {Math.max(...telemetryPoints.map(t => typeof t.speed === 'number' && !isNaN(t.speed) ? t.speed : 0)).toFixed(1)} m/s
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-emerald-500/30 group hover:border-emerald-500/50 transition-all">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Battery</p>
                  <p className="text-2xl font-bold text-emerald-400 inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">
                    {battery !== null ? `${battery.toFixed(1)}%` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Min: {Math.min(...telemetryPoints.map(t => typeof t.battery === 'number' && !isNaN(t.battery) ? t.battery : 100)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-cyan-500/30 group hover:border-cyan-500/50 transition-all">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Points</p>
                  <p className="text-2xl font-bold text-cyan-400 inline-block transform group-hover:scale-110 transition-transform duration-300 origin-center">
                    {telemetryPoints.length}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {latest.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {advancedMetrics && (
          <div className="mb-6 glass-card rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Advanced Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-white/80 text-sm mb-2">G-Force</h3>
                <p className="text-white text-lg font-semibold">
                  Max: {advancedMetrics.gforce?.max?.toFixed(2) || 'N/A'}G
                </p>
                <p className="text-white/60 text-sm">
                  Avg: {advancedMetrics.gforce?.average?.toFixed(2) || 'N/A'}G
                </p>
              </div>
              <div>
                <h3 className="text-white/80 text-sm mb-2">Maneuvers</h3>
                <p className="text-white text-lg font-semibold">
                  {advancedMetrics.maneuvers?.length || 0} detected
                </p>
              </div>
              <div>
                <h3 className="text-white/80 text-sm mb-2">Battery Efficiency</h3>
                <p className="text-white text-lg font-semibold">
                  {advancedMetrics.battery_efficiency?.efficiency_score?.toFixed(0) || 'N/A'}%
                </p>
              </div>
            </div>
          </div>
        )}

        {telemetry.length > 0 && (
          <div className="mb-6">
            <TelemetryGraphs telemetry={telemetry} />
          </div>
        )}

        {flight.risk_events && flight.risk_events.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Risk Events</h2>
            <div className="space-y-3">
              {flight.risk_events.map((event) => (
                <div key={event.id} className={`p-4 rounded-lg border-l-4 glass ${
                  event.severity === 'critical' ? 'border-red-500' :
                  event.severity === 'warning' ? 'border-yellow-500' :
                  'border-blue-500'
                }`}>
                  <p className="font-medium text-white">{event.description}</p>
                  <p className="text-sm text-white/60 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
