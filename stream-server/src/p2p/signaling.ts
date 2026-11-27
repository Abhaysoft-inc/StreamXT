import type { Server, Socket } from 'socket.io';

export type P2PRole = 'host' | 'guest' | 'compositor';

export interface P2PPeerInfo {
  peerId: string;
  role: P2PRole;
  name: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

const rooms = new Map<string, Map<string, P2PPeerInfo>>();
const roomStudioStates = new Map<string, unknown>();

export function getActiveP2PRoomCount(): number {
  return rooms.size;
}

export function setRoomStudioState(roomId: string, state: unknown): void {
  roomStudioStates.set(roomId, state);
}

export function registerP2PSignaling(io: Server): void {
  const p2p = io.of('/p2p');

  p2p.on('connection', (socket: Socket) => {
    let joinedRoomId: string | null = null;

    socket.on(
      'p2p:join',
      (payload: {
        roomId?: string;
        role?: P2PRole;
        name?: string;
        micEnabled?: boolean;
        videoEnabled?: boolean;
        screenSharing?: boolean;
      }) => {
        const roomId = payload.roomId?.trim();
        if (!roomId || roomId.length > 80) {
          socket.emit('p2p:error', { message: 'Invalid room ID' });
          return;
        }

        const role: P2PRole =
          payload.role === 'host' || payload.role === 'compositor' ? payload.role : 'guest';
        const name = (payload.name || role).trim().slice(0, 40);

        let room = rooms.get(roomId);
        if (!room) {
          room = new Map<string, P2PPeerInfo>();
          rooms.set(roomId, room);
        }

        if (role === 'guest') {
          const existingGuests = Array.from(room.values()).filter(
            (p) => p.role === 'guest' && p.peerId !== socket.id,
          );
          if (existingGuests.length >= 1) {
            socket.emit('p2p:error', {
              message: 'This P2P studio room already has an active guest.',
            });
            return;
          }
        }

        joinedRoomId = roomId;
        void socket.join(roomId);

        const peerInfo: P2PPeerInfo = {
          peerId: socket.id,
          role,
          name,
          micEnabled: payload.micEnabled ?? true,
          videoEnabled: payload.videoEnabled ?? true,
          screenSharing: payload.screenSharing ?? false,
        };

        const existingPeers = Array.from(room.values()).filter((p) => p.peerId !== socket.id);
        room.set(socket.id, peerInfo);

        socket.emit('p2p:room-peers', {
          selfId: socket.id,
          peers: existingPeers,
        });

        const savedState = roomStudioStates.get(roomId);
        if (role === 'compositor' && savedState) {
          socket.emit('p2p:studio-state', savedState);
        }

        socket.to(roomId).emit('p2p:peer-joined', peerInfo);
      },
    );

    socket.on(
      'p2p:peer-state',
      (patch: { micEnabled?: boolean; videoEnabled?: boolean; screenSharing?: boolean; name?: string }) => {
        if (!joinedRoomId) return;
        const room = rooms.get(joinedRoomId);
        const peer = room?.get(socket.id);
        if (!peer) return;

        if (typeof patch.micEnabled === 'boolean') peer.micEnabled = patch.micEnabled;
        if (typeof patch.videoEnabled === 'boolean') peer.videoEnabled = patch.videoEnabled;
        if (typeof patch.screenSharing === 'boolean') peer.screenSharing = patch.screenSharing;
        if (typeof patch.name === 'string' && patch.name.trim()) {
          peer.name = patch.name.trim().slice(0, 40);
        }

        socket.to(joinedRoomId).emit('p2p:peer-state', peer);
      },
    );

    socket.on('p2p:studio-state', (state: unknown) => {
      if (!joinedRoomId) return;
      roomStudioStates.set(joinedRoomId, state);
      socket.to(joinedRoomId).emit('p2p:studio-state', state);
    });

    socket.on('p2p:offer', (payload: { to?: string; sdp?: unknown }) => {
      if (!joinedRoomId || !payload.to || !payload.sdp) return;
      p2p.to(payload.to).emit('p2p:offer', {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on('p2p:answer', (payload: { to?: string; sdp?: unknown }) => {
      if (!joinedRoomId || !payload.to || !payload.sdp) return;
      p2p.to(payload.to).emit('p2p:answer', {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on('p2p:ice-candidate', (payload: { to?: string; candidate?: unknown }) => {
      if (!joinedRoomId || !payload.to || !payload.candidate) return;
      p2p.to(payload.to).emit('p2p:ice-candidate', {
        from: socket.id,
        candidate: payload.candidate,
      });
    });

    const handleLeave = () => {
      if (!joinedRoomId) return;
      const room = rooms.get(joinedRoomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(joinedRoomId);
          roomStudioStates.delete(joinedRoomId);
        }
      }
      socket.to(joinedRoomId).emit('p2p:peer-left', { peerId: socket.id });
      void socket.leave(joinedRoomId);
      joinedRoomId = null;
    };

    socket.on('p2p:leave', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
