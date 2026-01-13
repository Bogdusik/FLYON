import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  API_PREFIX: z.string().default('/api/v1'),
  WS_PORT: z.string().default('3002'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Database (required)
  POSTGRES_HOST: z.string().min(1, 'POSTGRES_HOST is required'),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB is required'),

  // JWT (required in production)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('your-super-secret-jwt-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_DEVICE_TOKEN_EXPIRES_IN: z.string().default('365d'),

  // Rate Limiting
  DISABLE_RATE_LIMIT: z.string().transform(val => val === 'true').default('false'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Redis (optional)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),

  // Weather API (optional)
  WEATHER_API_KEY: z.string().optional(),
  WEATHER_API_URL: z.string().url().optional(),

  // File Upload
  MAX_FILE_SIZE: z.string().default('10485760'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(e => e.code === 'too_small' || e.code === 'invalid_type')
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('\n');

      console.error('❌ Environment validation failed!\n');
      console.error('Missing or invalid environment variables:');
      console.error(missingVars);
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      console.error('See backend/.env.example for reference.\n');
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// Type-safe environment variables
export default {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  apiPrefix: env.API_PREFIX,
  wsPort: parseInt(env.WS_PORT, 10),
  corsOrigin: env.CORS_ORIGIN,
  postgres: {
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT, 10),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    deviceTokenExpiresIn: env.JWT_DEVICE_TOKEN_EXPIRES_IN,
  },
  rateLimit: {
    disabled: env.DISABLE_RATE_LIMIT,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  redis: env.REDIS_HOST ? {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT || '6379', 10),
  } : undefined,
  weather: env.WEATHER_API_KEY ? {
    apiKey: env.WEATHER_API_KEY,
    apiUrl: env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5',
  } : undefined,
  upload: {
    maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
    uploadDir: env.UPLOAD_DIR,
  },
};
