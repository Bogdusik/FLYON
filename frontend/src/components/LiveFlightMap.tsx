'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Telemetry, DangerZone } from '@/types';
import { parsePosition } from '@/utils/position';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Create custom drone icon (yellow teardrop like in screenshot)
const createDroneIcon = (heading?: number) => {
  return L.divIcon({
    className: 'drone-marker-live',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        transform: rotate(${heading || 0}deg);
      ">
        <div style="
          width: 0;
          height: 0;
          border-left: 20px solid transparent;
          border-right: 20px solid transparent;
          border-top: 30px solid #fbbf24;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        "></div>
        <div style="
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: #000;
          border-radius: 2px;
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 35],
  });
};

interface LiveFlightMapProps {
  telemetry: Telemetry[];
  dangerZones: DangerZone[];
  latestTelemetry?: Telemetry;
  followDrone?: boolean;
}

function MapUpdater({ center, follow }: { center: [number, number]; follow?: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && follow) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, follow, map]);
  
  return null;
}

export default function LiveFlightMap({ telemetry, dangerZones, latestTelemetry, followDrone = false }: LiveFlightMapProps) {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [mapZoom, setMapZoom] = useState(15);
  const [mapType, setMapType] = useState<'satellite' | 'dark'>('satellite');

  // Parse telemetry points
  const validPoints = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return [];
    
    return telemetry
      .filter(t => {
        if (!t || !t.position) return false;
        try {
          const pos = parsePosition(t.position);
          return pos && !isNaN(pos.latitude) && !isNaN(pos.longitude);
        } catch {
          return false;
        }
      })
      .map(t => {
        const pos = parsePosition(t.position);
        return [pos.latitude, pos.longitude] as [number, number];
      });
  }, [telemetry]);

  // Parse danger zones
  const parsedZones = useMemo(() => {
    if (!dangerZones || dangerZones.length === 0) return [];
    
    return dangerZones
      .filter(zone => zone && zone.is_active)
      .map(zone => {
        if (!zone.geometry) return null;
        try {
          // Parse WKT POLYGON format
          const match = zone.geometry.match(/POLYGON\(\(([^)]+)\)\)/);
          if (!match) return null;
          
          const coords = match[1].split(',').map(coord => {
            const [lon, lat] = coord.trim().split(/\s+/);
            return [parseFloat(lat), parseFloat(lon)] as [number, number];
          });
          
          return { ...zone, coordinates: coords };
        } catch {
          return null;
        }
      })
      .filter((zone): zone is DangerZone & { coordinates: [number, number][] } => zone !== null);
  }, [dangerZones]);

  useEffect(() => {
    if (validPoints.length > 0) {
      const latest = validPoints[validPoints.length - 1];
      setCurrentPosition(latest);
      setPath(validPoints);
    }
  }, [validPoints]);

  const defaultCenter: [number, number] = currentPosition || [0, 0];

  if (typeof window === 'undefined') {
    return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">Loading map...</div>;
  }

  const getTileUrl = () => {
    if (mapType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  };

  // Ensure we have a valid center
  const mapCenter: [number, number] = currentPosition || [51.505, -0.09]; // Default to London

  return (
    <div className="w-full h-full relative bg-gray-900">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="rounded-none"
      >
        {mapType === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url={getTileUrl()}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={getTileUrl()}
            subdomains="abcd"
          />
        )}
        
        {/* Danger Zones - Green polygons */}
        {parsedZones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.coordinates}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <div>
                <h3 className="font-bold">{zone.name}</h3>
                {zone.description && <p className="text-sm">{zone.description}</p>}
                {zone.altitude_limit_meters && (
                  <p className="text-sm">Max Altitude: {zone.altitude_limit_meters}m</p>
                )}
              </div>
            </Popup>
          </Polygon>
        ))}
        
        {/* Flight Path - Light blue lines */}
        {path.length > 1 && (
          <Polyline
            positions={path}
            color="#60a5fa"
            weight={3}
            opacity={0.8}
            smoothFactor={1}
          />
        )}

        {/* Current Drone Position */}
        {currentPosition && latestTelemetry && (
          <>
            <CircleMarker
              center={currentPosition}
              radius={8}
              pathOptions={{
                fillColor: '#fbbf24',
                fillOpacity: 0.3,
                color: '#fbbf24',
                weight: 2,
              }}
            />
            <Marker 
              position={currentPosition} 
              icon={createDroneIcon(latestTelemetry.heading_degrees || undefined)}
            >
              <Popup className="drone-popup">
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-gray-900 mb-2">Drone Position</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>ID:</strong> {latestTelemetry.id.slice(0, 6)}</p>
                    <p><strong>ASL:</strong> {typeof latestTelemetry.altitude_meters === 'number' 
                      ? `${latestTelemetry.altitude_meters.toFixed(1)} m` 
                      : 'N/A'}</p>
                    <p><strong>Speed:</strong> {typeof latestTelemetry.speed_mps === 'number' 
                      ? `${latestTelemetry.speed_mps.toFixed(1)} m/s` 
                      : 'N/A'}</p>
                    <p><strong>Battery:</strong> {typeof latestTelemetry.battery_percent === 'number' 
                      ? `${latestTelemetry.battery_percent.toFixed(0)}%` 
                      : 'N/A'}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {currentPosition && <MapUpdater center={currentPosition} follow={followDrone} />}
      </MapContainer>

      {/* Map Controls - Compact and Non-overlapping */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        {/* Search */}
        <button 
          onClick={() => alert('Search functionality coming soon')}
          className="btn-dji-floating flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" 
          style={{ background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(8px)', width: '36px', height: '36px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          title="Search location"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Tools - Compact */}
        <div className="flex flex-col gap-1 bg-[#0a0a0a]/95 backdrop-blur-sm rounded-md p-1.5 border border-white/10">
          <button 
            onClick={() => alert('Map layers coming soon')}
            className="btn-dji-floating flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" 
            style={{ width: '28px', height: '28px', background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            title="Map layers"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <button 
            onClick={() => alert('Menu coming soon')}
            className="btn-dji-floating flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" 
            style={{ width: '28px', height: '28px', background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            title="Menu"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Compass - Compact */}
        <div className="bg-[#0a0a0a]/95 backdrop-blur-sm rounded-md p-2 flex flex-col items-center border border-white/10">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border border-white/30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-[10px] font-medium">N</span>
            </div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-0.5">
              <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-white"></div>
            </div>
          </div>
          <button 
            onClick={() => {
              setMapType(mapType === 'satellite' ? 'dark' : 'satellite');
            }}
            className="btn-dji btn-dji-sm mt-1.5 text-[10px] cursor-pointer"
            title="Toggle 3D/Satellite view"
          >
            3D
          </button>
        </div>

        {/* Zoom Controls - Compact */}
        <div className="flex flex-col gap-1 bg-[#0a0a0a]/95 backdrop-blur-sm rounded-md p-1.5 border border-white/10">
          <button 
            onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Zoom in"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            onClick={() => setMapZoom(prev => Math.max(prev - 1, 3))}
            className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Zoom out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Map Info Bottom - Compact */}
      {currentPosition && latestTelemetry && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-[#0a0a0a]/90 backdrop-blur-sm rounded-md p-2 text-white text-[10px] border border-white/10">
          <div className="flex gap-3">
            <div>
              <p className="text-white/80"><span className="text-white/60">ASL:</span> {typeof latestTelemetry.altitude_meters === 'number' 
                ? `${latestTelemetry.altitude_meters.toFixed(1)}m` 
                : 'N/A'}</p>
              <p className="text-white/80"><span className="text-white/60">HAE:</span> {typeof latestTelemetry.altitude_meters === 'number' 
                ? `${(latestTelemetry.altitude_meters - 20).toFixed(1)}m` 
                : 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60">Scale: 30m</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
