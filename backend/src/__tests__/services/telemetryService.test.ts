jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../websocket', () => ({ broadcastTelemetry: jest.fn(), broadcastWarning: jest.fn() }));
jest.mock('../../services/rthService', () => ({ calculateRTH: jest.fn(), triggerRTH: jest.fn() }));
jest.mock('../../services/flightService', () => ({ getFlightBySessionId: jest.fn() }));
jest.mock('../../services/flightStats', () => ({
  recordPoint: jest.fn().mockResolvedValue(undefined),
  recomputeFlightStats: jest.fn().mockResolvedValue(undefined),
}));

import { query } from '../../config/database';
import { getFlightBySessionId } from '../../services/flightService';
import { recordPoint } from '../../services/flightStats';
import { FlightNotActiveError, ingestTelemetry } from '../../services/telemetryService';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetFlight = getFlightBySessionId as jest.MockedFunction<typeof getFlightBySessionId>;
const mockRecordPoint = recordPoint as jest.MockedFunction<typeof recordPoint>;

const input = {
  session_id: 'session-1',
  latitude: 55.07,
  longitude: -3.6,
  altitude: 30,
  speed: 6,
  battery: 80,
  timestamp: '2026-10-06T12:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [{ id: 'telemetry-1' }], rowCount: 1 } as any);
});

describe('ingestTelemetry', () => {
  it('stores the point and hands it to the live stats instead of recomputing the flight', async () => {
    mockGetFlight.mockResolvedValue({ id: 'flight-1', status: 'active' } as any);
    await ingestTelemetry('drone-1', 'user-1', input as any);

    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO telemetry');
    const sql = mockQuery.mock.calls.map(([text]) => String(text));
    expect(sql.some((text) => text.includes('COUNT(*)') || text.includes('ordered_telemetry'))).toBe(false);
    expect(mockRecordPoint).toHaveBeenCalledWith('flight-1', {
      id: 'telemetry-1',
      timestamp: new Date(input.timestamp),
      latitude: 55.07,
      longitude: -3.6,
      altitude: 30,
      speed: 6,
      battery: 80,
    });
  });

  it('rejects a point for a completed flight and stores nothing', async () => {
    mockGetFlight.mockResolvedValue({ id: 'flight-1', status: 'completed' } as any);
    await expect(ingestTelemetry('drone-1', 'user-1', input as any)).rejects.toBeInstanceOf(FlightNotActiveError);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockRecordPoint).not.toHaveBeenCalled();
  });
});
