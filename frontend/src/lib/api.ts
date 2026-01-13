import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

/**
 * API client for FLYON backend
 */

const api = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // Could show a toast notification here
    }
    
    // Handle server errors (500+)
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: { name?: string; phone?: string; avatar_url?: string }) => api.patch('/auth/me', data),
  deleteMe: () => api.delete('/auth/me'),
};

// Drones API
export const dronesAPI = {
  getAll: () => api.get('/drones'),
  getById: (id: string) => api.get(`/drones/${id}`),
  create: (data: {
    name: string;
    model?: string;
    manufacturer?: string;
    firmware_version?: string;
    metadata?: Record<string, any>;
  }) => api.post('/drones', data),
  update: (id: string, data: {
    name?: string;
    model?: string;
    manufacturer?: string;
    firmware_version?: string;
    metadata?: Record<string, any>;
  }) => api.patch(`/drones/${id}`, data),
  regenerateToken: (id: string) => api.post(`/drones/${id}/regenerate-token`),
  delete: (id: string) => api.delete(`/drones/${id}`),
};

// Flights API
export const flightsAPI = {
  getAll: (params?: { drone_id?: string; status?: string; limit?: number; offset?: number }) =>
    api.get('/flights', { params }),
  getById: (id: string) => api.get(`/flights/${id}`),
  create: (data: { drone_id: string; session_id?: string; started_at?: string }) =>
    api.post('/flights', data),
  update: (id: string, data: { ended_at?: string; status?: string }) =>
    api.patch(`/flights/${id}`, data),
  delete: (id: string) => api.delete(`/flights/${id}`),
  deleteAll: () => api.delete('/flights'),
  complete: (id: string) =>
    api.patch(`/flights/${id}`, { status: 'completed', ended_at: new Date().toISOString() }),
  getTelemetry: (id: string, params?: { limit?: number; offset?: number; start_time?: string; end_time?: string }) =>
    api.get(`/flights/${id}/telemetry`, { params }),
  recalculateStats: (id: string) =>
    api.post(`/flights/${id}/recalculate-stats`),
  uploadLog: (file: File, droneId: string, sessionId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('drone_id', droneId);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    return api.post('/flights/upload-log', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Danger Zones API
export const dangerZonesAPI = {
  getAll: () => api.get('/danger-zones'),
  getById: (id: string) => api.get(`/danger-zones/${id}`),
  create: (data: {
    name: string;
    description?: string;
    zone_type: 'user' | 'community' | 'airport' | 'restricted';
    coordinates: Array<{ lat: number; lon: number }>;
    altitude_limit_meters?: number;
    is_public?: boolean;
    metadata?: Record<string, any>;
  }) => api.post('/danger-zones', data),
  update: (id: string, data: {
    name?: string;
    description?: string;
    coordinates?: Array<{ lat: number; lon: number }>;
    altitude_limit_meters?: number;
    is_active?: boolean;
    metadata?: Record<string, any>;
  }) => api.patch(`/danger-zones/${id}`, data),
  delete: (id: string) => api.delete(`/danger-zones/${id}`),
};

// Analytics API
export const analyticsAPI = {
  calculateHealthScore: (flightId: string) =>
    api.post(`/analytics/flights/${flightId}/health-score`),
  generateRiskEvents: (flightId: string) =>
    api.post(`/analytics/flights/${flightId}/risk-events`),
};

// Export API
export const exportAPI = {
  exportData: () => api.get('/export/data'),
  exportFlightKML: (flightId: string) => api.get(`/export/flights/${flightId}/kml`, { responseType: 'blob' }),
  exportFlightGPX: (flightId: string) => api.get(`/export/flights/${flightId}/gpx`, { responseType: 'blob' }),
};

// Remotes API
export const remotesAPI = {
  getAll: () => api.get('/remotes'),
  getById: (id: string) => api.get(`/remotes/${id}`),
  connectRadioMaster: (data?: { name?: string; model?: string }) => api.post('/remotes/radiomaster/connect', data),
  disconnect: (id: string) => api.post(`/remotes/${id}/disconnect`),
  updateStatus: (id: string, status: 'connected' | 'disconnected' | 'connecting') =>
    api.patch(`/remotes/${id}/status`, { status }),
  updateMetadata: (id: string, metadata: Record<string, any>) =>
    api.patch(`/remotes/${id}/metadata`, { metadata }),
  delete: (id: string) => api.delete(`/remotes/${id}`),
};

// Betaflight API
export const betaflightAPI = {
  uploadConfig: (droneId: string, file: File) => {
    const formData = new FormData();
    formData.append('config', file);
    return api.post(`/drones/${droneId}/betaflight/config`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getConfig: (droneId: string) => api.get(`/drones/${droneId}/betaflight/config`),
  getConfigHistory: (droneId: string) => api.get(`/drones/${droneId}/betaflight/config/history`),
  compareConfigs: (droneId: string, config1Id: string, config2Id: string) =>
    api.post(`/drones/${droneId}/betaflight/config/compare`, { config1_id: config1Id, config2_id: config2Id }),
  getRecommendations: (droneId: string) => api.get(`/drones/${droneId}/betaflight/recommendations`),
  uploadBlackbox: (flightId: string, file: File) => {
    const formData = new FormData();
    formData.append('blackbox', file);
    return api.post(`/flights/${flightId}/blackbox`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getBlackboxAnalysis: (flightId: string) => api.get(`/flights/${flightId}/blackbox/analysis`),
};

// Advanced Analytics API
export const advancedAnalyticsAPI = {
  compareFlights: (flight1Id: string, flight2Id: string) =>
    api.post('/analytics/flights/compare', { flight1_id: flight1Id, flight2_id: flight2Id }),
  getAdvancedMetrics: (flightId: string) => api.get(`/analytics/flights/${flightId}/advanced`),
  getTrends: (months?: number) => api.get('/analytics/trends', { params: { months } }),
};

// Sharing API
export const sharingAPI = {
  createFlightShare: (flightId: string, data?: { is_public?: boolean; expires_in_days?: number }) =>
    api.post(`/flights/${flightId}/share`, data),
  getSharedFlight: (token: string) => api.get(`/shared/flights/${token}`),
  getMySharedFlights: () => api.get('/sharing/flights'),
  deleteShare: (token: string) => api.delete(`/sharing/flights/${token}`),
  getAchievements: () => api.get('/achievements'),
  checkAchievements: () => api.post('/achievements/check'),
  updatePublicProfile: (data: { is_public?: boolean; profile_bio?: string; profile_avatar_url?: string }) =>
    api.patch('/profile/public', data),
  getPublicProfile: (userId: string) => api.get(`/users/${userId}/public`),
};

// Weather API
export const weatherAPI = {
  getWeather: (lat: number, lon: number, timestamp?: string) =>
    api.get('/weather', { params: { lat, lon, timestamp } }),
};

export default api;
