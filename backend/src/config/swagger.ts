import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FLYON API',
      version: '1.0.0',
      description: 'Comprehensive drone analytics and telemetry platform API',
      contact: {
        name: 'FLYON Support',
        email: 'support@flyon.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.flyon.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
        deviceToken: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Device token for drone authentication (Bearer <token>)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            last_login: { type: 'string', format: 'date-time', nullable: true },
            is_active: { type: 'boolean' },
          },
        },
        Drone: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            model: { type: 'string', nullable: true },
            manufacturer: { type: 'string', nullable: true },
            device_token: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Flight: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            drone_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string' },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
            duration_seconds: { type: 'number', nullable: true },
            total_distance_meters: { type: 'number', nullable: true },
            max_altitude_meters: { type: 'number', nullable: true },
            max_speed_mps: { type: 'number', nullable: true },
            min_battery_percent: { type: 'number', nullable: true },
            health_score: { type: 'number', nullable: true },
          },
        },
        Telemetry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            flight_id: { type: 'string', format: 'uuid' },
            drone_id: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            altitude_meters: { type: 'number' },
            speed_mps: { type: 'number', nullable: true },
            heading_degrees: { type: 'number', nullable: true },
            battery_percent: { type: 'number', nullable: true },
            flight_mode: { type: 'string', nullable: true },
            is_armed: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string', nullable: true },
            details: { type: 'object', nullable: true },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Drones', description: 'Drone management endpoints' },
      { name: 'Flights', description: 'Flight session management' },
      { name: 'Telemetry', description: 'Telemetry data ingestion' },
      { name: 'Analytics', description: 'Flight analytics and statistics' },
      { name: 'Danger Zones', description: 'Danger zone management' },
      { name: 'Export', description: 'Data export endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FLYON API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // JSON endpoint for Swagger spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
