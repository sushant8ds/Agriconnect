import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import { Booking } from '../models/Booking';
import { JwtPayload } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const STALE_THRESHOLD_MS = 30_000; // 30 seconds

interface Location {
  lat: number;
  lng: number;
}

interface TrackingRoom {
  providerWs: WebSocket | null;
  farmerWs: WebSocket | null;
  lastLocation: Location | null;
  lastUpdated: number | null;
  staleTimer: ReturnType<typeof setInterval> | null;
}

// bookingId -> room
const trackingRooms = new Map<string, TrackingRoom>();

function getOrCreateRoom(bookingId: string): TrackingRoom {
  if (!trackingRooms.has(bookingId)) {
    trackingRooms.set(bookingId, {
      providerWs: null,
      farmerWs: null,
      lastLocation: null,
      lastUpdated: null,
      staleTimer: null,
    });
  }
  return trackingRooms.get(bookingId)!;
}

function startStaleTimer(bookingId: string): void {
  const room = trackingRooms.get(bookingId);
  if (!room) return;

  if (room.staleTimer) clearInterval(room.staleTimer);

  room.staleTimer = setInterval(() => {
    const r = trackingRooms.get(bookingId);
    if (!r) return;

    const now = Date.now();
    const isStale = r.lastUpdated !== null && now - r.lastUpdated > STALE_THRESHOLD_MS;

    if (isStale && r.lastLocation && r.farmerWs && r.farmerWs.readyState === WebSocket.OPEN) {
      r.farmerWs.send(
        JSON.stringify({
          type: 'location',
          lat: r.lastLocation.lat,
          lng: r.lastLocation.lng,
          timestamp: r.lastUpdated,
          stale: true,
        })
      );
    }
  }, STALE_THRESHOLD_MS);
}

/**
 * Close both WebSocket connections for a booking room.
 * Called when booking transitions to Completed or Cancelled.
 * Requirement 11.2
 */
export function closeTrackingRoom(bookingId: string): void {
  const room = trackingRooms.get(bookingId);
  if (!room) return;

  if (room.staleTimer) {
    clearInterval(room.staleTimer);
    room.staleTimer = null;
  }

  const closeWs = (ws: WebSocket | null) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Booking ended');
    }
  };

  closeWs(room.providerWs);
  closeWs(room.farmerWs);

  trackingRooms.delete(bookingId);
}

/**
 * Attach a WebSocket server to the HTTP server for GPS tracking.
 * URL pattern: /ws/tracking/:bookingId?token=<jwt>
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
export function setupGpsTracking(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    const parsedUrl = new URL(reqUrl, `http://${request.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Match /ws/tracking/:bookingId
    const match = pathname.match(/^\/ws\/tracking\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, match[1]);
    });
  });

  wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage, bookingId: string) => {
    // Parse JWT from query param
    const reqUrl = request.url || '';
    const parsedUrl = new URL(reqUrl, `http://${request.headers.host || 'localhost'}`);
    const token = parsedUrl.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    // Fetch booking and verify user is farmer or provider
    let booking;
    try {
      booking = await Booking.findById(bookingId);
    } catch {
      ws.close(4004, 'Invalid booking ID');
      return;
    }

    if (!booking) {
      ws.close(4004, 'Booking not found');
      return;
    }

    const farmerId = booking.farmer_id.toString();
    const providerId = booking.provider_id.toString();
    const userId = payload.userId;

    if (userId !== farmerId && userId !== providerId) {
      ws.close(4003, 'Access denied');
      return;
    }

    // Requirement 11.1: only allow connections for InProgress bookings
    if (booking.status !== 'InProgress') {
      ws.close(4000, 'Booking is not InProgress');
      return;
    }

    const room = getOrCreateRoom(bookingId);
    const isProvider = userId === providerId;

    if (isProvider) {
      room.providerWs = ws;
    } else {
      room.farmerWs = ws;
    }

    // Start stale detection timer once provider connects
    if (isProvider) {
      startStaleTimer(bookingId);
    }

    ws.on('message', (data) => {
      // Only process messages from the provider
      if (!isProvider) return;

      let msg: { type?: string; lat?: number; lng?: number };
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type !== 'location' || typeof msg.lat !== 'number' || typeof msg.lng !== 'number') {
        return;
      }

      const r = trackingRooms.get(bookingId);
      if (!r) return;

      // Update last known location (Requirement 11.1, 11.3)
      r.lastLocation = { lat: msg.lat, lng: msg.lng };
      r.lastUpdated = Date.now();

      // Broadcast to farmer (Requirement 11.1)
      if (r.farmerWs && r.farmerWs.readyState === WebSocket.OPEN) {
        r.farmerWs.send(
          JSON.stringify({
            type: 'location',
            lat: msg.lat,
            lng: msg.lng,
            timestamp: r.lastUpdated,
            stale: false,
          })
        );
      }
    });

    ws.on('close', () => {
      const r = trackingRooms.get(bookingId);
      if (!r) return;
      if (isProvider) {
        r.providerWs = null;
      } else {
        r.farmerWs = null;
      }
      // Clean up room if both disconnected
      if (!r.providerWs && !r.farmerWs) {
        if (r.staleTimer) clearInterval(r.staleTimer);
        trackingRooms.delete(bookingId);
      }
    });
  });
}

// ── Real-time booking event broadcast ────────────────────────────────────────
// Clients connect to /ws/events?token=<jwt> to receive live booking updates.

const eventClients = new Set<WebSocket>();

/**
 * Broadcast a booking event to all connected event clients.
 * Called from bookingController after create/update.
 */
export function broadcastBookingEvent(event: { type: string; booking: object }): void {
  const msg = JSON.stringify(event);
  for (const client of eventClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

/**
 * Attach the /ws/events endpoint to the existing HTTP server.
 * Must be called after setupGpsTracking so the upgrade handler is shared.
 */
export function setupEventStream(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    const parsedUrl = new URL(reqUrl, `http://${request.headers.host || 'localhost'}`);
    if (parsedUrl.pathname !== '/ws/events') return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
    const reqUrl = request.url || '';
    const parsedUrl = new URL(reqUrl, `http://${request.headers.host || 'localhost'}`);
    const token = parsedUrl.searchParams.get('token');

    if (!token) { ws.close(4001, 'Missing token'); return; }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    eventClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('close', () => eventClients.delete(ws));
    ws.on('error', () => eventClients.delete(ws));
  });
}
