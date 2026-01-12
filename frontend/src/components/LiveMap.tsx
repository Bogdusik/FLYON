'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Create custom drone icon
const createDroneIcon = () => {
  return L.divIcon({
    className: 'drone-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface TelemetryPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  battery: number;
  timestamp: string;
}

interface LiveMapProps {
  telemetry: TelemetryPoint[];
  center?: [number, number];
  zoom?: number;
  showPath?: boolean;
  followDrone?: boolean;
}

function MapUpdater({ center, follow }: { center?: [number, number]; follow?: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && follow) {
      map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, follow, map]);

  return null;
}

export default function LiveMap({ telemetry, center, zoom = 15, showPath = true, followDrone = false }: LiveMapProps) {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPoint | null>(null);

  useEffect(() => {
    if (telemetry.length > 0) {
      // Filter and validate all telemetry points
      const validPoints = telemetry
        .filter(t => 
          t &&
          typeof t.latitude === 'number' && !isNaN(t.latitude) &&
          typeof t.longitude === 'number' && !isNaN(t.longitude) &&
          t.latitude >= -90 && t.latitude <= 90 &&
          t.longitude >= -180 && t.longitude <= 180
        )
        .map(t => [t.latitude, t.longitude] as [number, number]);
      
      if (validPoints.length > 0) {
        // Set current position to the latest point
        const latest = validPoints[validPoints.length - 1];
        setCurrentPosition(latest);
        
        // Set latest telemetry for popup
        const latestTelemetry = telemetry[telemetry.length - 1];
        setLatestTelemetry(latestTelemetry);
        
        // Set path for trajectory (even if only 1 point)
        if (showPath) {
          setPath(validPoints);
        }
      }
    } else {
      // Clear path if no telemetry
      setPath([]);
      setCurrentPosition(null);
      setLatestTelemetry(null);
    }
  }, [telemetry, showPath]);

  const defaultCenter: [number, number] = center || currentPosition || [51.505, -0.09];

  if (typeof window === 'undefined') {
    return <div className="w-full h-full bg-gray-200 flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="rounded-lg"
      >
        {/* Beautiful dark map style */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        
        {/* Flight path - bright and visible */}
        {showPath && path.length > 0 && (
          <>
            {path.length > 1 ? (
              <>
                {/* Main path line */}
                <Polyline
                  positions={path}
                  color="#3b82f6"
                  weight={5}
                  opacity={0.9}
                  smoothFactor={1}
                />
                {/* Glow effect */}
                <Polyline
                  positions={path}
                  color="#8b5cf6"
                  weight={3}
                  opacity={0.5}
                  dashArray="10, 5"
                />
                {/* Start marker */}
                <CircleMarker
                  center={path[0]}
                  radius={6}
                  pathOptions={{
                    fillColor: '#10b981',
                    fillOpacity: 0.8,
                    color: '#ffffff',
                    weight: 2,
                  }}
                >
                  <Popup>Flight Start</Popup>
                </CircleMarker>
                {/* End marker */}
                {path.length > 1 && (
                  <CircleMarker
                    center={path[path.length - 1]}
                    radius={6}
                    pathOptions={{
                      fillColor: '#ef4444',
                      fillOpacity: 0.8,
                      color: '#ffffff',
                      weight: 2,
                    }}
                  >
                    <Popup>Flight End</Popup>
                  </CircleMarker>
                )}
              </>
            ) : (
              // Single point - show as a circle
              <CircleMarker
                center={path[0]}
                radius={10}
                pathOptions={{
                  fillColor: '#3b82f6',
                  fillOpacity: 0.6,
                  color: '#60a5fa',
                  weight: 3,
                }}
              >
                <Popup>Single Telemetry Point</Popup>
              </CircleMarker>
            )}
          </>
        )}

        {/* Current position marker with custom icon */}
        {currentPosition && latestTelemetry && (
          <>
            <CircleMarker
              center={currentPosition}
              radius={8}
              pathOptions={{
                fillColor: '#3b82f6',
                fillOpacity: 0.3,
                color: '#60a5fa',
                weight: 2,
              }}
            />
            <Marker position={currentPosition} icon={createDroneIcon()}>
              <Popup className="drone-popup">
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-gray-900 mb-2">Drone Position</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Altitude:</strong> {typeof latestTelemetry.altitude === 'number' && !isNaN(latestTelemetry.altitude) ? `${latestTelemetry.altitude.toFixed(1)} m` : 'N/A'}</p>
                    <p><strong>Speed:</strong> {typeof latestTelemetry.speed === 'number' && !isNaN(latestTelemetry.speed) ? `${latestTelemetry.speed.toFixed(1)} m/s` : 'N/A'}</p>
                    <p><strong>Battery:</strong> {typeof latestTelemetry.battery === 'number' && !isNaN(latestTelemetry.battery) ? `${latestTelemetry.battery.toFixed(1)}%` : 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {latestTelemetry.timestamp ? new Date(latestTelemetry.timestamp).toLocaleTimeString() : ''}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Auto-follow drone position */}
        <MapUpdater center={currentPosition || undefined} follow={followDrone} />
      </MapContainer>
    </div>
  );
}
