'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Telemetry } from '@/types';

interface TelemetryGraphsProps {
  telemetry: Telemetry[];
}

export default function TelemetryGraphs({ telemetry }: TelemetryGraphsProps) {
  const chartData = useMemo(() => {
    return telemetry.map((point, index) => {
      const position = parsePosition(point.position);
      return {
        time: index,
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
        altitude: point.altitude_meters || 0,
        speed: point.speed_mps || 0,
        battery: point.battery_percent || 0,
        heading: point.heading_degrees || 0,
      };
    });
  }, [telemetry]);

  if (telemetry.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <p className="text-white/60">No telemetry data available for graphs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Altitude Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Altitude Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
              label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Altitude (m)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Speed Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Speed Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
              label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              name="Speed (m/s)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Battery Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Battery Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: 'rgba(255,255,255,0.6)' }}
              label={{ value: 'Battery (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
            <Line
              type="monotone"
              dataKey="battery"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Battery (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function parsePosition(wkt: string): { lat: number; lon: number } | null {
  const match = wkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!match) return null;
  return { lat: parseFloat(match[2]), lon: parseFloat(match[1]) };
}
