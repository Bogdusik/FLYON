import { generateUserToken, generateDeviceToken, verifyToken } from '../../utils/auth';

describe('Auth Utils', () => {
  describe('generateUserToken', () => {
    it('should generate a valid JWT token for user', () => {
      const token = generateUserToken('test-user-id', 'test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('generateDeviceToken', () => {
    it('should generate a valid device token', () => {
      const token = generateDeviceToken('test-drone-id', 'test-user-id');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid user token', () => {
      const token = generateUserToken('test-user-id', 'test@example.com');

      const decoded = verifyToken(token);

      expect(decoded.userId).toBe('test-user-id');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('user');
    });

    it('should verify a valid device token', () => {
      const token = generateDeviceToken('test-drone-id', 'test-user-id');

      const decoded = verifyToken(token);

      expect(decoded.droneId).toBe('test-drone-id');
      expect(decoded.userId).toBe('test-user-id');
      expect(decoded.type).toBe('device');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });
  });
});
