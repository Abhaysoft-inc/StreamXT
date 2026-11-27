import type { Server, Socket } from 'socket.io';

export interface P2PPeerInfo {
  peerId: string;
  role: 'host' | 'guest';
  name: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

const rooms = new Map<string, Map<string, P2PPeerInfo>>();

export function getActiveP2PRoomCount(): number {
  return rooms.size;
}

export function registerP2PSignaling(io: Server): void {
  const p2p = io.of('/p2p');

  p2p.on('connection', (socket: Socket) => {
    let joinedRoomId: string | null = null;

    socket.on(
      'p2p:join',
      (payload: {
        roomId?: string;
        role?: 'host' | 'guest';
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

        const role: 'host' | 'guest' = payload.role === 'host' ? 'host' : 'guest';
        const name = (payload.name || (role === 'host' ? 'Host' : 'Guest')).trim().slice(0, 40);

        let room = rooms.get(roomId);
        if (!room) {
          room = new Map<string, P2PPeerInfo>();
          rooms.set(roomId, room);
        }

        // Prevent more than 1 guest in 1:1 P2P mode so connections stay clean and reliable
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
