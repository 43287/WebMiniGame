import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { createServer as createViteServer } from 'vite';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  GameType,
  GameState,
  Player,
} from './src/types.ts';
import { GameLogic } from './src/games/GameInterface.ts';
import { logicRegistry } from './src/games/logicRegistry.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

// Game Logic Instances (modular registry)
const games: Record<GameType, GameLogic> = logicRegistry;

// In-memory storage
const rooms: Map<string, Room> = new Map();
const socketToRoom: Map<string, string> = new Map(); // Optimization: socketId -> roomId
const playerTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Track cleanup timeouts for disconnected players

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (playerName, clientPlayerId) => {
    const roomId = nanoid(6);
    // Use client-provided playerId if available (e.g. from local storage or previous session), 
    // otherwise generate a new one. This ensures consistency.
    const playerId = clientPlayerId || nanoid(10);
    const player: Player = {
      id: playerId,
      socketId: socket.id,
      name: playerName,
      isBot: false,
      isConnected: true,
    };

    const room: Room = {
      id: roomId,
      gameType: null,
      players: [player],
      gameState: null,
      settings: {},
    };

    rooms.set(roomId, room);
    socketToRoom.set(socket.id, roomId);
    
    socket.join(roomId);
    socket.emit('joinedRoom', roomId, playerId);
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('joinRoom', (roomId, playerName) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.gameState && room.gameState.status === 'playing') {
      socket.emit('error', 'Game already started');
      return;
    }

    const playerId = nanoid(10);
    const player: Player = {
      id: playerId,
      socketId: socket.id,
      name: playerName,
      isBot: false,
      isConnected: true,
    };

    room.players.push(player);
    socketToRoom.set(socket.id, roomId);
    
    socket.join(roomId);
    socket.emit('joinedRoom', roomId, playerId);
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('rejoinRoom', (roomId, playerId) => {
    const room = rooms.get(roomId);
    if (!room) {
        socket.emit('error', 'Room not found or expired');
        return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
        socket.emit('error', 'Player not found in room');
        return;
    }

    // Clear any pending cleanup timeout
    if (playerTimeouts.has(playerId)) {
        clearTimeout(playerTimeouts.get(playerId)!);
        playerTimeouts.delete(playerId);
    }

    // Update socket info
    player.socketId = socket.id;
    player.isConnected = true;
    
    socketToRoom.set(socket.id, roomId);
    
    socket.join(roomId);
    socket.emit('rejoinedRoom', room, playerId);
    io.to(roomId).emit('roomUpdated', room);
    
    if (room.gameState) {
        // Send masked state to the rejoining player
        const gameLogic = games[room.gameType!];
        let stateToSend = room.gameState;
        if (gameLogic && gameLogic.maskState) {
            stateToSend = gameLogic.maskState(stateToSend, playerId);
        }
        socket.emit('gameStateUpdated', stateToSend);
    }
  });

  socket.on('selectGame', (gameType) => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    // Only host can select game (first player)
    if (room.players[0].id !== player.id) return;
    
    if (room.gameState && room.gameState.status === 'playing') return;

    room.gameType = gameType;
    // Reset settings when game type changes
    room.settings = {};
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('updateSettings', (settings) => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    // Only host can update settings
    if (room.players[0].id !== player.id) return;
    
    room.settings = settings;
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('sendChat', (message) => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    // Update player's chat message
    player.chatMessage = message;
    io.to(roomId).emit('roomUpdated', room);

    // Clear message after 3 seconds
    setTimeout(() => {
        // Check if player is still in room
        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
            const p = currentRoom.players.find((pl) => pl.id === player.id);
            if (p && p.chatMessage === message) { // Only clear if message hasn't changed
                delete p.chatMessage;
                io.to(roomId).emit('roomUpdated', currentRoom);
            }
        }
    }, 3000);
  });

  socket.on('leaveRoom', () => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;
    
    const playerIndex = room.players.findIndex((p) => p.id === player.id);
    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socketToRoom.delete(socket.id);
        socket.leave(roomId);
        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            io.to(roomId).emit('roomUpdated', room);
        }
    }
  });

  socket.on('startGame', () => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, roomId } = data;

    if (!room.gameType) return; // No game selected

    // Initialize Game
    const gameLogic = games[room.gameType];
    room.gameState = gameLogic.init(room.players, room.settings);
    
    broadcastGameState(io, roomId, room);
    io.to(roomId).emit('roomUpdated', room);

    // Check if first player is Bot
     if (room.gameState.status === 'playing' && room.gameState.currentTurn) {
         const currentPlayer = room.players.find(p => p.id === room.gameState!.currentTurn);
         if (currentPlayer && currentPlayer.isBot) {
              setTimeout(() => {
                  try {
                    handleBotMove(roomId, room);
                  } catch (e) {
                    console.error('Error in first bot move:', e);
                  }
              }, 500);
          }
      }
  });

  socket.on('makeMove', (move) => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    if (!room.gameState) return;

    try {
        const gameLogic = games[room.gameType!];
        const newState = gameLogic.makeMove(room.gameState, player.id, move);
        
        room.gameState = newState;
        broadcastGameState(io, roomId, room);

        // Check for Bot Turns
        if (newState.status === 'playing' && newState.currentTurn) {
            const currentPlayer = room.players.find(p => p.id === newState.currentTurn);
            if (currentPlayer && currentPlayer.isBot) {
                setTimeout(() => {
                    handleBotMove(roomId, room);
                }, 1000); // Delay for "thinking" effect
            }
        }
    } catch (error) {
        console.error('Error in makeMove:', error);
    }
  });

  socket.on('addBot', () => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, roomId } = data;

    if (room.gameState) return; // Cannot add bot if game started

    const botId = `bot-${nanoid(4)}`;
    const bot: Player = {
      id: botId,
      name: `Bot ${botId.slice(-4)}`,
      isBot: true,
      isConnected: true,
    };

    room.players.push(bot);
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('removeBot', (botId) => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    // Only host can remove bots
    if (room.players[0].id !== player.id) return;

    if (room.gameState) return; // Cannot remove bot if game started

    const botIndex = room.players.findIndex((p) => p.id === botId && p.isBot);
    if (botIndex !== -1) {
        room.players.splice(botIndex, 1);
        io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('returnToLobby', () => {
    const data = findPlayerBySocketId(socket.id);
    if (!data) return;
    const { room, player, roomId } = data;

    // Only host can return to lobby
    if (room.players[0].id !== player.id) return;

    room.gameState = null;
    broadcastGameState(io, roomId, room);
    io.to(roomId).emit('roomUpdated', room);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const data = findPlayerBySocketId(socket.id);
    
    // Cleanup socket mapping regardless of room found
    socketToRoom.delete(socket.id);

    if (!data) return; // Already handled or not in a room
    const { room, player, roomId } = data;

    player.isConnected = false;

    // If game started, we keep the player disconnected but present.
    // If game NOT started (Lobby), we give a grace period for reconnection.
    if (room.gameState) {
        // Schedule cleanup if everyone is disconnected? 
        // For now, keep the room alive indefinitely if game is running (or until server restart).
        io.to(roomId).emit('roomUpdated', room);
    } else {
        // Lobby state: Mark as disconnected but delay removal
        io.to(roomId).emit('roomUpdated', room);

        // Clear existing timeout if any (debouncing)
        if (playerTimeouts.has(player.id)) {
            clearTimeout(playerTimeouts.get(player.id)!);
        }

        const timeout = setTimeout(() => {
            // Check if room still exists
            const currentRoom = rooms.get(roomId);
            if (!currentRoom) return;
            
            // Check if player is still disconnected
            const p = currentRoom.players.find(p => p.id === player.id);
            if (p && !p.isConnected) {
                // Remove player
                const idx = currentRoom.players.findIndex(pl => pl.id === player.id);
                if (idx !== -1) {
                    currentRoom.players.splice(idx, 1);
                    console.log(`Removed disconnected player ${player.id} from room ${roomId}`);
                    
                    if (currentRoom.players.length === 0) {
                        rooms.delete(roomId);
                        console.log(`Deleted empty room ${roomId}`);
                    } else {
                        io.to(roomId).emit('roomUpdated', currentRoom);
                    }
                }
            }
            playerTimeouts.delete(player.id);
        }, 30000); // 30 seconds grace period for Lobby reconnection
        
        playerTimeouts.set(player.id, timeout);
    }
  });
});

function findPlayerBySocketId(socketId: string): { room: Room, player: Player, roomId: string } | null {
    const roomId = socketToRoom.get(socketId);
    if (!roomId) return null;
    
    const room = rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
        return { room, player, roomId };
    }
    
    return null;
}

function broadcastGameState(io: Server, roomId: string, room: Room) {
    if (!room.gameState) {
        io.to(roomId).emit('gameStateUpdated', null);
        return;
    }
    
    const gameLogic = games[room.gameType!];
    
    room.players.forEach(player => {
        if (player.isConnected && player.socketId) {
            let stateToSend = room.gameState!;
            // Apply masking if available
            if (gameLogic && gameLogic.maskState) {
                stateToSend = gameLogic.maskState(stateToSend, player.id);
            }
            io.to(player.socketId).emit('gameStateUpdated', stateToSend);
        }
    });
}

function handleBotMove(roomId: string, room: Room) {
    if (!room.gameState) return;
    
    try {
        const gameLogic = games[room.gameType!];
        const botId = room.gameState.currentTurn;
        
        const move = gameLogic.getBotMove(room.gameState, botId);
        
        if (move) {
            const newState = gameLogic.makeMove(room.gameState, botId, move);
            room.gameState = newState;
            broadcastGameState(io, roomId, room);

            // Chain next bot move if applicable
            if (newState.status === 'playing' && newState.currentTurn) {
                const nextPlayer = room.players.find(p => p.id === newState.currentTurn);
                if (nextPlayer && nextPlayer.isBot) {
                    setTimeout(() => {
                        handleBotMove(roomId, room);
                    }, 1000);
                }
            }
        }
    } catch (error) {
        console.error('Error in handleBotMove:', error);
    }
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
          middlewareMode: true,
          allowedHosts: ['frp-tip.com', '.frp-tip.com', 'localhost', '127.0.0.1'],
          hmr: {
              server: httpServer,
          },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production (if needed, but usually handled by build)
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
