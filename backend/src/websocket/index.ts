/**
 * WebSocket server entry point
 * Import this in server.ts to start the WebSocket server
 */

export { wsServer, broadcastTelemetry, broadcastFlightUpdate, broadcastWarning, broadcastRTHCommand } from './server';
