'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { flightsAPI, dangerZonesAPI } from '@/lib/api';
import { Flight, Telemetry, DangerZone } from '@/types';
import { getWebSocketClient } from '@/lib/websocket';
import Navbar from '@/components/Navbar';
import LiveFlightMap from '@/components/LiveFlightMap';
import VideoFeedPanel from '@/components/VideoFeedPanel';
import FlightControlPanel from '@/components/FlightControlPanel';
import { toast } from '@/components/Toast';

const MAX_TELEMETRY_POINTS = 10000;

export default function LiveFlightPage() {
  const params = useParams();
  const router = useRouter();
  const flightId = params.id as string;
  
  const [flight, setFlight] = useState<Flight | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const wsClientRef = useRef<any>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flightStartTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    loadFlightData();
    return () => {
      cleanup();
    };
  }, [flightId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space - Pause (only if not typing in input)
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handlePause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = useCallback(() => {
    try {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, []);

  const loadFlightData = async () => {
    try {
      const [flightRes, zonesRes] = await Promise.all([
        flightsAPI.getById(flightId),
        dangerZonesAPI.getAll(),
      ]);
      
      const flightData = flightRes.data;
      setFlight(flightData);
      setDangerZones(zonesRes.data);
      
      if (flightData.status === 'active') {
        flightStartTimeRef.current = new Date(flightData.started_at);
        // Setup WebSocket after flight is set
        setupWebSocket();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load flight data');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = getWebSocketClient(token);
    wsClientRef.current = ws;
    
    ws.connect().then(() => {
      ws.subscribe(flightId);
      
      const telemetryHandler = (message: any) => {
        if (message.flight_id === flightId) {
          const newPoint: Telemetry = {
            id: message.data.id || `temp-${Date.now()}`,
            flight_id: flightId,
            drone_id: flight?.drone_id || '',
            timestamp: message.data.timestamp || new Date().toISOString(),
            position: `POINT(${message.data.longitude} ${message.data.latitude})`,
            altitude_meters: message.data.altitude || 0,
            speed_mps: message.data.speed || 0,
            heading_degrees: message.data.heading || null,
            battery_percent: message.data.battery || 100,
            flight_mode: message.data.flight_mode || null,
            is_armed: message.data.is_armed || false,
            raw_data: {},
            created_at: message.data.timestamp || new Date().toISOString(),
          };
          
          setTelemetry(prev => {
            const updated = [...prev, newPoint];
            if (updated.length > MAX_TELEMETRY_POINTS) {
              return updated.slice(-MAX_TELEMETRY_POINTS);
            }
            return updated;
          });
        }
      };

      const warningHandler = (message: any) => {
        // Show danger zone warning
        console.warn('Danger zone warning:', message.data);
      };

      const flightUpdateHandler = (message: any) => {
        if (message.flight_id === flightId) {
          setFlight(prev => prev ? { ...prev, ...message.data } : null);
        }
      };

      ws.on('telemetry', telemetryHandler);
      ws.on('warning', warningHandler);
      ws.on('flight_update', flightUpdateHandler);
    }).catch(err => {
      console.error('WebSocket connection failed:', err);
    });
  }, [flightId, flight]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const handleRTH = async () => {
    if (!flightId) {
      console.error('Flight ID is missing');
      toast.error('Flight ID is missing. Please refresh the page.');
      return;
    }

    if (!confirm('Return to home? This will end the current flight.')) return;

    try {
      // Cleanup WebSocket before navigation
      cleanup();
      
      // Update flight status
      await flightsAPI.update(flightId, { 
        status: 'completed',
        ended_at: new Date().toISOString(),
      });
      
      toast.success('Return to home initiated. Flight completed.');
      
      // Navigate to flight details page
      router.push(`/flights/${flightId}`);
    } catch (err: any) {
      console.error('RTH error:', err);
      
      // Handle rate limiting
      if (err.isRateLimit) {
        toast.error(`Rate limit exceeded. Please try again in ${Math.ceil(err.retryAfter / 60)} minutes.`);
        return;
      }
      
      // Handle network errors
      if (!err.response) {
        toast.error('Network error. Please check your connection and try again.');
        return;
      }
      
      // Handle other errors
      const errorMessage = err.response?.data?.error || err.message || 'Failed to return to home';
      toast.error(errorMessage);
    }
  };

  const handleEmergencyLanding = async () => {
    if (!flightId) {
      console.error('Flight ID is missing');
      toast.error('Flight ID is missing. Please refresh the page.');
      return;
    }

    if (!confirm('EMERGENCY LANDING! Are you absolutely sure?')) return;

    try {
      // Cleanup WebSocket before navigation
      cleanup();
      
      // Update flight status
      await flightsAPI.update(flightId, { 
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      });
      
      toast.warning('Emergency landing initiated. Flight cancelled.');
      
      // Navigate to flight details page
      router.push(`/flights/${flightId}`);
    } catch (err: any) {
      console.error('Emergency landing error:', err);
      
      // Handle rate limiting
      if (err.isRateLimit) {
        toast.error(`Rate limit exceeded. Please try again in ${Math.ceil(err.retryAfter / 60)} minutes.`);
        return;
      }
      
      // Handle network errors
      if (!err.response) {
        toast.error('Network error. Please check your connection and try again.');
        return;
      }
      
      // Handle other errors
      const errorMessage = err.response?.data?.error || err.message || 'Failed to execute emergency landing';
      toast.error(errorMessage);
    }
  };

  const handlePause = () => {
    // Pause flight tracking (doesn't affect actual drone)
    toast.info('Flight tracking paused. This does not affect the actual drone.');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFlightTime = () => {
    if (!flightStartTimeRef.current) return 0;
    return Math.floor((Date.now() - flightStartTimeRef.current.getTime()) / 1000);
  };

  const getRTHTime = () => {
    // Calculate based on distance and speed (simplified)
    const latest = telemetry[telemetry.length - 1];
    if (!latest) return 0;
    // Estimate: assume 5 m/s return speed
    return Math.floor(300); // Placeholder
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mb-3"></div>
          <p>Loading flight data...</p>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-4">
          <div className="glass-card rounded-lg p-5 text-center border border-white/10">
            <p className="text-red-400 mb-4 text-sm">{error || 'Flight not found'}</p>
            <button
              onClick={() => router.push('/flights')}
              className="btn-dji btn-dji-sm"
            >
              Back to Flights
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (flight.status !== 'active') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-4">
          <div className="glass-card rounded-lg p-5 text-center border border-white/10">
            <p className="text-yellow-400 mb-4 text-sm">This flight is not active. Live view is only available for active flights.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push(`/flights/${flightId}`)}
                className="btn-dji btn-dji-sm"
              >
                View Details
              </button>
              <button
                onClick={() => router.push('/flights')}
                className="btn-dji btn-dji-sm opacity-70"
              >
                Back to Flights
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const latestTelemetry = telemetry[telemetry.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative z-50">
        <Navbar />
      </div>
      
      {/* Top Bar - Compact */}
      <div className="bg-[#0a0a0a] border-b border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 relative z-40">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-white text-xs sm:text-sm font-medium">
            Live Flight - {flight.status === 'active' ? 'Active' : 'Returning'}
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-white/60 flex-wrap">
          <span className="hidden sm:inline">ISO 1620</span>
          <span className="hidden sm:inline">1/12.5</span>
          <span className="hidden sm:inline">F1.7</span>
          <span className="hidden sm:inline">EV0</span>
          <div className="flex items-center gap-1 sm:gap-1.5 sm:ml-2">
            <span className="text-emerald-400 text-[10px] sm:text-xs">●</span>
            <span className="text-[10px] sm:text-xs">80ms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded"></div>
            <span className="text-[10px] sm:text-xs">4G</span>
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] relative">
        {/* Left Panel - Map */}
        <div className="flex-1 border-r-0 lg:border-r border-white/10 border-b lg:border-b-0 relative overflow-hidden min-h-[300px] lg:min-h-0">
          <LiveFlightMap
            telemetry={telemetry}
            dangerZones={dangerZones}
            latestTelemetry={latestTelemetry}
            followDrone={flight.status === 'active'}
          />
        </div>

        {/* Right Panel - Video Feed */}
        <div className="w-full lg:w-[400px] bg-[#0a0a0a] border-l-0 lg:border-l border-white/10 border-t lg:border-t-0 relative overflow-hidden">
          <VideoFeedPanel
            isRecording={isRecording}
            recordingTime={recordingTime}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="border-t border-white/10 bg-[#0a0a0a] relative z-30">
        <FlightControlPanel
          flight={flight}
          latestTelemetry={latestTelemetry}
          flightTime={getFlightTime()}
          rthTime={getRTHTime()}
          onRTH={handleRTH}
          onEmergencyLanding={handleEmergencyLanding}
          onPause={handlePause}
        />
      </div>
    </div>
  );
}
