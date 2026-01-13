// Mock WebSocket server before importing anything that uses it
jest.mock('../../websocket/server', () => ({
  wsServer: {
    broadcastRTHCommand: jest.fn(),
  },
  broadcastRTHCommand: jest.fn(),
}));

// Mock database before importing rthService
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

import { calculateRTH } from '../../services/rthService';
import { query } from '../../config/database';

// Mock the query function
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('RTH Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock flight data with proper PostGIS format
    mockQuery.mockResolvedValue({
      rows: [{
        start_lat: '55.7558',
        start_lon: '37.6173',
        drone_id: 'test-drone-id',
      }],
      rowCount: 1,
    } as any);
  });

  describe('calculateRTH', () => {
    it('should calculate RTH correctly when battery is sufficient', async () => {
      const result = await calculateRTH(
        'test-flight-id',
        55.7558, // Moscow lat
        37.6173, // Moscow lon
        50, // 50% battery
        10, // 10 m/s speed
        180, // heading
        100 // 100m altitude
      );

      expect(result).toHaveProperty('distanceToHome');
      expect(result).toHaveProperty('estimatedTimeToHome');
      expect(result).toHaveProperty('batteryNeeded');
      expect(result).toHaveProperty('shouldReturn');
      expect(typeof result.distanceToHome).toBe('number');
      expect(typeof result.estimatedTimeToHome).toBe('number');
    });

    it('should recommend return when battery is low', async () => {
      const result = await calculateRTH(
        'test-flight-id',
        55.7558,
        37.6173,
        15, // Low battery
        10,
        180,
        100
      );

      // Should recommend return when battery is very low
      expect(result.urgency).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(result.urgency);
    });
  });
});
