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
  updateMe: (data: { name?: string }) => api.patch('/auth/me', data),
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

export default api;
