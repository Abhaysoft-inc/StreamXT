import http from 'node:http';
import os from 'node:os';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { env } from './config/env';
import {
  getActiveP2PRoomCount,
  registerP2PSignaling,
  setRoomStudioState,
} from './p2p/signaling';
import {
  cloudCompositor,
  resolveChromiumExecutable,
} from './services/cloudCompositor';
import { streamManager } from './services/ffmpegManager';
import { verifyStreamTicket, type StreamTicketClaims } from './services/ticket.service';

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.get('/health', (_req, res) => {
  const activeStreams = streamManager.getActiveCount();
  const maxStreams = env.MAX_CONCURRENT_STREAMS;
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'streamxt-stream-server',
      activeStreams,
      activeCompositors: cloudCompositor.getActiveCount(),
      chromiumReady: Boolean(resolveChromiumExecutable()),
      maxStreams,
      capacityRemaining: Math.max(0, maxStreams - activeStreams),
    },
  });
});

app.get('/metrics', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    data: {
      activeStreams: streamManager.getActiveCount(),
      activeCompositors: cloudCompositor.getActiveCount(),
      activeP2PRooms: getActiveP2PRoomCount(),
      maxStreams: env.MAX_CONCURRENT_STREAMS,
      uptimeSeconds: Math.floor(process.uptime()),
      loadAverage: os.loadavg(),
      memoryRssMb: Math.round(mem.rss / 1024 / 1024),
    },
  });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
  maxHttpBufferSize: 5 * 1024 * 1024,
  pingTimeout: 20000,
  pingInterval: 10000,
});

registerP2PSignaling(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || !token) {
    next(new Error('Missing stream authorization ticket'));
    return;
  }

  try {
    const claims = await verifyStreamTicket(token);
    socket.data.claims = claims;
    socket.data.ticket = token;
    socket.data.isCompositor = socket.handshake.auth?.compositor === true;
    next();
  } catch {
    next(new Error('Invalid or expired stream authorization ticket'));
  }
});

io.on('connection', (socket) => {
  const claims = socket.data.claims as StreamTicketClaims;
  const ticket = socket.data.ticket as string;
  const isCompositor = Boolean(socket.data.isCompositor);

  if (!isCompositor) {
    streamManager.attachControlSocket(claims.sessionId, socket);
  }

  socket.on('stream:start', () => {
    streamManager.startStream(socket, claims, { isControlSocket: !isCompositor });
  });

  socket.on('stream:start-cloud', async (payload?: { roomId?: string; studioState?: unknown }) => {
    const roomId = payload?.roomId || claims.roomId;
    if (!roomId) {
      socket.emit('stream:error', {
        sessionId: claims.sessionId,
        message: 'Room ID is required for Cloud Compositor mode',
      });
      return;
    }

    if (payload?.studioState) {
      setRoomStudioState(roomId, payload.studioState);
    }

    streamManager.startStream(socket, claims, { isControlSocket: true });

    try {
      await cloudCompositor.startCompositor({
        sessionId: claims.sessionId,
        roomId,
        ticket,
        quality: claims.quality,
        onError: (message) => {
          socket.emit('stream:error', { sessionId: claims.sessionId, message });
          streamManager.stopStream(claims.sessionId);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start cloud compositor';
      socket.emit('stream:error', { sessionId: claims.sessionId, message });
      streamManager.stopStream(claims.sessionId);
    }
  });

  socket.on('stream:data', (chunk: ArrayBuffer | Buffer) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (buffer.length > 0) {
      streamManager.writeChunk(claims.sessionId, buffer);
    }
  });

  socket.on('stream:stop', () => {
    streamManager.stopStream(claims.sessionId);
  });

  socket.on('disconnect', () => {
    // In Cloud Mode, keep the cloud compositor + YouTube RTMP alive if the host briefly drops
    if (claims.mode === 'cloud' && !isCompositor) {
      return;
    }
    streamManager.stopStream(claims.sessionId);
  });
});

httpServer.listen(env.PORT, () => {
  console.log(`StreamXT stream-server listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[stream-server] Received ${signal}. Stopping active streams...`);
  await streamManager.stopAll();
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
