import { GameState, Player } from '../types.ts';

export interface GameLogic {
  minPlayers: number;
  maxPlayers: number;
  init(players: Player[], settings?: any): GameState;
  makeMove(state: GameState, playerId: string, move: any): GameState;
  getBotMove(state: GameState, botId: string): any | null;
  checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' };
  maskState?(state: GameState, playerId: string): GameState;
}
