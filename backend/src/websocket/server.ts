import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../utils/auth';
import { query } from '../config/database';

/**
 * WebSocket server for real-time telemetry updates
 * Clients can subscribe to flight sessions to receive live telemetry
 */

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  subscribedFlights: Set<string>;
}

class FlightWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    console.log(`🔌 WebSocket server running on port ${port}`);
  }

  private async handleConnection(ws: WebSocket, req: any) {
    // Extract token from query string or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = verifyToken(token);
      
      if (decoded.type !== 'user') {
        ws.close(1008, 'Invalid token type');
        return;
      }

      const connection: ClientConnection = {
        ws,
        userId: decoded.userId,
        subscribedFlights: new Set(),
      };

      this.clients.set(ws, connection);

      ws.on('message', (message: string) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to FLYON WebSocket server',
      }));

    } catch (error: any) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, error.message || 'Authentication failed');
    }
  }

  private handleMessage(ws: WebSocket, message: string) {
    try {
      const data = JSON.parse(message.toString());
      const connection = this.clients.get(ws);

      if (!connection) {
        ws.close(1008, 'Connection not found');
        return;
      }

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(connection, data.flight_id);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(connection, data.flight_id);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          }));
      }
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Invalid message format',
      }));
    }
  }

  private async handleSubscribe(connection: ClientConnection, flightId: string) {
    // Verify user has access to this flight
    const result = await query(
      'SELECT id FROM flights WHERE id = $1 AND user_id = $2',
      [flightId, connection.userId]
    );

    if (result.rows.length === 0) {
      connection.ws.send(JSON.stringify({
        type: 'error',
        message: 'Flight not found or access denied',
      }));
      return;
    }

    connection.subscribedFlights.add(flightId);

    connection.ws.send(JSON.stringify({
      type: 'subscribed',
      flight_id: flightId,
    }));
  }

  private handleUnsubscribe(connection: ClientConnection, flightId: string) {
    connection.subscribedFlights.delete(flightId);

    connection.ws.send(JSON.stringify({
      type: 'unsubscribed',
      flight_id: flightId,
    }));
  }

  /**
   * Broadcast telemetry update to all clients subscribed to the flight
   */
  public broadcastTelemetry(flightId: string, telemetry: any) {
    const message = JSON.stringify({
      type: 'telemetry',
      flight_id: flightId,
      data: telemetry,
    });

    for (const [ws, connection] of this.clients.entries()) {
      if (connection.subscribedFlights.has(flightId)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  /**
   * Broadcast flight status update
   */
  public broadcastFlightUpdate(flightId: string, update: any) {
    const message = JSON.stringify({
      type: 'flight_update',
      flight_id: flightId,
      data: update,
    });

    for (const [ws, connection] of this.clients.entries()) {
      if (connection.subscribedFlights.has(flightId)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  /**
   * Broadcast danger zone warning
   */
  public broadcastWarning(userId: string, warning: any) {
    const message = JSON.stringify({
      type: 'warning',
      data: warning,
    });

    for (const [ws, connection] of this.clients.entries()) {
      if (connection.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

// Create singleton instance
const WS_PORT = parseInt(process.env.WS_PORT || '3002');
export const wsServer = new FlightWebSocketServer(WS_PORT);

// Export function to broadcast from other modules
export function broadcastTelemetry(flightId: string, telemetry: any) {
  wsServer.broadcastTelemetry(flightId, telemetry);
}

export function broadcastFlightUpdate(flightId: string, update: any) {
  wsServer.broadcastFlightUpdate(flightId, update);
}

export function broadcastWarning(userId: string, warning: any) {
  wsServer.broadcastWarning(userId, warning);
}
