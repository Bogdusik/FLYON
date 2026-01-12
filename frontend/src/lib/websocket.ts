/**
 * WebSocket client for real-time updates
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export class FlightWebSocketClient {
  private ws: WebSocket | null = null;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;

  constructor(token: string) {
    this.token = token;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      try {
        const ws = new WebSocket(`${WS_URL}?token=${this.token}`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          this.ws = ws;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect().catch(console.error);
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Also call 'message' handlers for all messages
    const allHandlers = this.messageHandlers.get('message');
    if (allHandlers) {
      allHandlers.forEach((handler) => handler(message));
    }
  }

  subscribe(flightId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        flight_id: flightId,
      }));
    }
  }

  unsubscribe(flightId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        flight_id: flightId,
      }));
    }
  }

  on(messageType: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  off(messageType: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }
}

// Singleton instance
let wsClient: FlightWebSocketClient | null = null;

export function getWebSocketClient(token: string): FlightWebSocketClient {
  if (!wsClient || wsClient !== wsClient) {
    wsClient = new FlightWebSocketClient(token);
  }
  return wsClient;
}
