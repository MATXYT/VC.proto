import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

interface PlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  inVehicle: boolean;
  vehicleType?: string;
  vehicleSpeed?: number;
  anim: string;
  health: number;
  lastPing: number;
  wantedLevel: number;
}

const players = new Map<string, { ws: WebSocket; state: PlayerState }>();

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#a855f7'
];

wss.on('connection', (ws) => {
  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const playerColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const initialPlayer: PlayerState = {
    id: playerId,
    name: 'Player ' + playerId.substring(2, 5).toUpperCase(),
    color: playerColor,
    x: 0,
    y: 0.8,
    z: 0,
    yaw: 0,
    inVehicle: false,
    anim: 'idle',
    health: 100,
    lastPing: Date.now(),
    wantedLevel: 0
  };

  players.set(playerId, { ws, state: initialPlayer });

  // Send assignment to newly joined client
  ws.send(JSON.stringify({
    type: 'init',
    id: playerId,
    name: initialPlayer.name,
    color: playerColor,
    players: Array.from(players.values()).map(p => p.state)
  }));

  // Broadcast to other players
  const joinMsg = JSON.stringify({
    type: 'player:joined',
    player: initialPlayer
  });
  for (const [id, client] of players.entries()) {
    if (id !== playerId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(joinMsg);
    }
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const playerEntry = players.get(playerId);
      if (!playerEntry) return;

      if (msg.type === 'update') {
        // Update stored state
        Object.assign(playerEntry.state, {
          x: msg.x ?? playerEntry.state.x,
          y: msg.y ?? playerEntry.state.y,
          z: msg.z ?? playerEntry.state.z,
          yaw: msg.yaw ?? playerEntry.state.yaw,
          inVehicle: !!msg.inVehicle,
          vehicleType: msg.vehicleType,
          vehicleSpeed: msg.vehicleSpeed,
          anim: msg.anim ?? playerEntry.state.anim,
          health: msg.health ?? playerEntry.state.health,
          wantedLevel: msg.wantedLevel ?? playerEntry.state.wantedLevel,
          lastPing: Date.now()
        });

        // Broadcast delta update to other peers
        const updatePayload = JSON.stringify({
          type: 'player:update',
          id: playerId,
          ...msg
        });

        for (const [id, client] of players.entries()) {
          if (id !== playerId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(updatePayload);
          }
        }
      } else if (msg.type === 'shoot') {
        const shootPayload = JSON.stringify({
          type: 'player:shot',
          id: playerId,
          origin: msg.origin,
          direction: msg.direction,
          weapon: msg.weapon
        });
        for (const [id, client] of players.entries()) {
          if (id !== playerId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(shootPayload);
          }
        }
      } else if (msg.type === 'chat') {
        const chatPayload = JSON.stringify({
          type: 'chat:message',
          id: playerId,
          name: playerEntry.state.name,
          text: String(msg.text || '').substring(0, 100),
          time: Date.now()
        });
        for (const [, client] of players.entries()) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(chatPayload);
          }
        }
      } else if (msg.type === 'set_name') {
        playerEntry.state.name = String(msg.name || playerEntry.state.name).substring(0, 16);
      }
    } catch {
      // safe fallback on corrupted message
    }
  });

  ws.on('close', () => {
    players.delete(playerId);
    const leaveMsg = JSON.stringify({
      type: 'player:left',
      id: playerId
    });
    for (const [, client] of players.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(leaveMsg);
      }
    }
  });

  ws.on('error', () => {
    players.delete(playerId);
  });
});

// Periodic heartbeat & sweep inactive connections (> 20s)
setInterval(() => {
  const now = Date.now();
  for (const [id, client] of players.entries()) {
    if (now - client.state.lastPing > 20000 || client.ws.readyState !== WebSocket.OPEN) {
      players.delete(id);
      const leaveMsg = JSON.stringify({ type: 'player:left', id });
      for (const [, other] of players.entries()) {
        if (other.ws.readyState === WebSocket.OPEN) {
          other.ws.send(leaveMsg);
        }
      }
    }
  }
}, 5000);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Vice City Web GTA',
    activePlayers: players.size,
    uptime: process.uptime()
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[GTA 3D Game Server] Running on http://localhost:${PORT} (WebSocket attached)`);
  });
}

startServer();
