export type Player = {
  id: string; // Persistent ID
  socketId?: string; // Current Socket ID
  name: string;
  isBot: boolean;
  isConnected: boolean;
  chatMessage?: string; // Current chat message
};

export type GameType = 'tictactoe' | 'uno' | 'poker';

export type GameState = {
  id: string;
  type: GameType;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null; // Player ID or 'draw'
  currentTurn: string; // Player ID
  // Game specific data will be in a separate field or extended type
  gameData: any;
};

export type Room = {
  id: string;
  gameType: GameType | null;
  players: Player[];
  gameState: GameState | null;
  settings: Record<string, any>;
};

// Client -> Server Events
export interface ClientToServerEvents {
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  makeMove: (move: any) => void;
  addBot: () => void;
  playAgain: () => void;
  selectGame: (gameType: GameType) => void;
  updateSettings: (settings: any) => void;
  sendChat: (message: string) => void;
  returnToLobby: () => void;
  rejoinRoom: (roomId: string, playerId: string) => void;
  removeBot: (botId: string) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  roomUpdated: (room: Room) => void;
  gameStateUpdated: (gameState: GameState) => void;
  error: (message: string) => void;
  joinedRoom: (roomId: string, playerId: string) => void;
  rejoinedRoom: (room: Room, playerId: string) => void;
}
