'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { flightsAPI, analyticsAPI, exportAPI } from '@/lib/api';
import { Flight, Telemetry, HealthScore } from '@/types';
import { getWebSocketClient } from '@/lib/websocket';
import TelemetryGraphs from '@/components/TelemetryGraphs';
import { showDangerZoneWarning, requestNotificationPermission } from '@/utils/notifications';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false });

export default function FlightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flightId = params.id as string;

  const [flight, setFlight] = useState<Flight | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);

  useEffect(() => {
    loadFlightData();
    
    // Request notification permission
    requestNotificationPermission();
  }, [flightId]);

  useEffect(() => {
    // Setup WebSocket when flight is loaded and active
    if (flight?.status === 'active') {
      setupWebSocket();
      
      // Poll for updates every 5 seconds for active flights
      const pollInterval = setInterval(() => {
        loadFlightData();
      }, 5000);

      return () => {
        clearInterval(pollInterval);
        // Cleanup WebSocket on unmount
        const token = localStorage.getItem('token');
        if (token) {
          const ws = getWebSocketClient(token);
          ws.disconnect();
        }
      };
    }
  }, [flight]);

  // Update latest telemetry when telemetry changes
  useEffect(() => {
    if (telemetry.length > 0) {
      const latest = telemetry[telemetry.length - 1];
      const pos = parsePosition(latest.position);
      if (pos) {
        setLatestTelemetry({
          latitude: pos.lat,
          longitude: pos.lon,
          altitude: latest.altitude_meters,
          speed: latest.speed_mps,
          battery: latest.battery_percent,
          timestamp: latest.timestamp,
        });
      }
    }
  }, [telemetry]);

  const loadFlightData = async () => {
    try {
      const [flightRes, telemetryRes] = await Promise.all([
        flightsAPI.getById(flightId),
        flightsAPI.getTelemetry(flightId, { limit: 1000 }),
      ]);

      setFlight(flightRes.data);
      setTelemetry(telemetryRes.data);
      setIsLive(flightRes.data.status === 'active');

      // Calculate health score if flight is completed
      if (flightRes.data.status === 'completed' && !flightRes.data.health_score) {
        try {
          const scoreRes = await analyticsAPI.calculateHealthScore(flightId);
          setHealthScore(scoreRes.data);
        } catch (error) {
          console.error('Failed to calculate health score:', error);
        }
      } else if (flightRes.data.health_score) {
        setHealthScore(flightRes.data.health_score);
      }
    } catch (error) {
      console.error('Failed to load flight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parsePosition = (wkt: string): { lat: number; lon: number } | null => {
    const match = wkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return null;
    return { lat: parseFloat(match[2]), lon: parseFloat(match[1]) };
  };

  const setupWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = getWebSocketClient(token);
    ws.connect().then(() => {
      ws.subscribe(flightId);
      
      ws.on('telemetry', (message: any) => {
        if (message.flight_id === flightId) {
          // Add new telemetry point
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
          setTelemetry(prev => [...prev, newPoint]);
        }
      });

      ws.on('warning', (message: any) => {
        showDangerZoneWarning(message.data.message || 'Danger zone warning');
      });
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!flight) {
    return <div className="min-h-screen flex items-center justify-center text-white">Flight not found</div>;
  }

  const telemetryPoints = telemetry.map(t => {
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

  const center = telemetryPoints.length > 0
    ? [telemetryPoints[0].latitude, telemetryPoints[0].longitude] as [number, number]
    : undefined;

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
              <Link href="/flights" className="text-white/90 hover:text-white transition-smooth relative group">
                Flights
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

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
            <div className="space-y-2 text-sm text-white/90">
              {flight.total_distance_meters && (
                <p><span className="font-medium">Distance:</span> {(flight.total_distance_meters / 1000).toFixed(2)} km</p>
              )}
              {flight.max_altitude_meters && (
                <p><span className="font-medium">Max Altitude:</span> {flight.max_altitude_meters.toFixed(1)} m</p>
              )}
              {flight.max_speed_mps && (
                <p><span className="font-medium">Max Speed:</span> {flight.max_speed_mps.toFixed(1)} m/s</p>
              )}
              {flight.min_battery_percent && (
                <p><span className="font-medium">Min Battery:</span> {flight.min_battery_percent.toFixed(1)}%</p>
              )}
            </div>
          </div>

          {healthScore && (
            <div className="glass-card rounded-xl p-6 hover-lift">
              <h3 className="text-lg font-semibold mb-4 text-white">Health Score</h3>
              <div className="space-y-2 text-sm text-white/90">
                <p><span className="font-medium">Overall:</span> <span className="text-2xl font-bold gradient-text ml-2">{healthScore.overall}/100</span></p>
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
                <div className="glass rounded-lg p-4 border border-blue-500/30">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Altitude</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {altitude !== null ? `${altitude.toFixed(1)} m` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Max: {Math.max(...telemetryPoints.map(t => typeof t.altitude === 'number' && !isNaN(t.altitude) ? t.altitude : 0)).toFixed(1)} m
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-purple-500/30">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Speed</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {speed !== null ? `${speed.toFixed(1)} m/s` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Max: {Math.max(...telemetryPoints.map(t => typeof t.speed === 'number' && !isNaN(t.speed) ? t.speed : 0)).toFixed(1)} m/s
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-emerald-500/30">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Battery</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {battery !== null ? `${battery.toFixed(1)}%` : 'N/A'}
                  </p>
                  {telemetryPoints.length > 1 && (
                    <p className="text-xs text-white/40 mt-1">
                      Min: {Math.min(...telemetryPoints.map(t => typeof t.battery === 'number' && !isNaN(t.battery) ? t.battery : 100)).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-cyan-500/30">
                  <p className="text-white/60 mb-2 text-xs uppercase tracking-wide">Points</p>
                  <p className="text-2xl font-bold text-cyan-400">
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
