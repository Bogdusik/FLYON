'use client';

import { useEffect, useState, memo } from 'react';
import { Flight, Telemetry } from '@/types';

interface FlightControlPanelProps {
  flight: Flight;
  latestTelemetry?: Telemetry;
  flightTime: number;
  rthTime: number;
  onRTH: () => void;
  onEmergencyLanding: () => void;
  onPause: () => void;
}

function FlightControlPanel({
  flight,
  latestTelemetry,
  flightTime,
  rthTime,
  onRTH,
  onEmergencyLanding,
  onPause,
}: FlightControlPanelProps) {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if (latestTelemetry?.heading_degrees !== null && latestTelemetry?.heading_degrees !== undefined) {
      setHeading(latestTelemetry.heading_degrees);
    }
  }, [latestTelemetry]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompassRotation = () => {
    return -heading; // Negative to rotate compass, not the needle
  };

  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  const batteryPercent = latestTelemetry?.battery_percent || 0;
  const altitude = latestTelemetry?.altitude_meters || 0;
  const speed = latestTelemetry?.speed_mps || 0;
  const verticalSpeed = 0; // Would come from telemetry if available
  const satellites = 43; // Would come from telemetry if available

  return (
    <div className="bg-[#0a0a0a] border-t border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side - Status Indicators - Compact */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-white/60 text-[10px] mb-0.5">Battery</span>
            <span className="text-white text-lg font-medium">{batteryPercent.toFixed(0)}%</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-white/60 text-[10px] mb-0.5">RTH</span>
            <span className="text-white text-lg font-medium">{formatTime(rthTime)}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-white/60 text-[10px] mb-0.5">To Land</span>
            <span className="text-white text-lg font-medium">{formatTime(rthTime + 360)}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-white/60 text-[10px] mb-0.5">Sats</span>
            <span className="text-white text-lg font-medium">{satellites}</span>
          </div>
        </div>

        {/* Middle - Compass and Telemetry - Compact */}
        <div className="flex items-center gap-4">
          {/* Compass - Smaller */}
          <div className="relative">
            <div className="w-20 h-20 relative">
              {/* Compass Background */}
              <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-[#0a0a0a]/50"></div>
              
              {/* Compass Ring with Numbers - Simplified */}
              <svg className="absolute inset-0 w-full h-full transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                {/* Cardinal Directions Only */}
                {['N', 'E', 'S', 'W'].map((dir, i) => {
                  const angle = (i * 90) - 90;
                  const rad = (angle * Math.PI) / 180;
                  const x = 50 + 35 * Math.cos(rad);
                  const y = 50 + 35 * Math.sin(rad);
                  return (
                    <text
                      key={dir}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-white text-[10px] font-medium fill-current"
                    >
                      {dir}
                    </text>
                  );
                })}
              </svg>
              
              {/* Rotating Compass Needle */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${getCompassRotation()}deg)` }}
              >
                <div className="w-0.5 h-10 bg-white rounded-full"></div>
              </div>
              
              {/* Center Dot */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
            </div>
            
            {/* Heading Display - Compact */}
            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-white text-sm font-medium">{heading.toFixed(0)}°</div>
              <div className="text-white/60 text-[10px]">{getCardinalDirection(heading)}</div>
            </div>
          </div>

          {/* Telemetry Values - Compact */}
          <div className="flex flex-col gap-1">
            <div className="text-white text-right">
              <div className="text-base font-medium">{heading.toFixed(0)}°</div>
              <div className="text-[10px] text-white/60">Heading</div>
            </div>
            <div className="text-white text-right">
              <div className="text-base font-medium">{speed.toFixed(1)} m/s</div>
              <div className="text-[10px] text-white/60">Speed</div>
            </div>
            <div className="text-white text-right">
              <div className="text-base font-medium">{altitude.toFixed(1)} m</div>
              <div className="text-[10px] text-white/60">Altitude</div>
            </div>
          </div>
        </div>

        {/* Right Side - Controls - Compact */}
        <div className="flex flex-col items-end gap-2">
          {/* Keyboard Shortcuts - Smaller */}
          <div className="flex gap-0.5">
            {['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'C'].map((key) => (
              <div
                key={key}
                className="w-6 h-6 bg-white/10 rounded text-white text-[10px] flex items-center justify-center border border-white/20"
              >
                {key}
              </div>
            ))}
          </div>

          {/* Control Buttons - Compact */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => alert('Settings coming soon')}
              className="btn-dji btn-dji-sm cursor-pointer"
              title="Open settings"
            >
              Settings
            </button>
            <button
              onClick={onRTH}
              className="btn-dji btn-dji-sm cursor-pointer"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.2)',
                color: 'rgba(147, 197, 253, 0.9)',
              }}
              title="Return to home"
            >
              RTH
            </button>
            <button
              onClick={onEmergencyLanding}
              className="btn-dji btn-dji-sm cursor-pointer"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: 'rgba(252, 165, 165, 0.9)',
              }}
              title="Emergency landing"
            >
              Emergency
            </button>
          </div>

          {/* Pause Button - Compact */}
          <button
            onClick={onPause}
            className="btn-dji btn-dji-sm flex items-center gap-1.5 cursor-pointer"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ffffff',
            }}
            title="Pause flight tracking (Space key)"
          >
            <span>Pause</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Space</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(FlightControlPanel);
