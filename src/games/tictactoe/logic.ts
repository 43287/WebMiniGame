import { GameLogic } from '../GameInterface.ts';
import { GameState, Player } from '../../types.ts';
import { getBotMove } from './ai.ts';

export type TicTacToeSettings = {
  superMode?: boolean;
  coverMode?: boolean; // New mode
};

export type TicTacToeData = {
  board: (string | null)[]; // "X", "O" (Normal/Super) OR "X-S", "X-B" (Cover)
  superMode?: boolean;
  coverMode?: boolean;
  activeGrid?: number | null; // Super Mode
  gridWinners?: (string | null)[]; // Super Mode
  bigPiecesLeft?: Record<string, number>; // Cover Mode: { [playerId]: count }
};

export class TicTacToe implements GameLogic {
  minPlayers = 2;
  maxPlayers = 2;
  
  init(players: Player[], settings?: TicTacToeSettings): GameState {
    const isSuper = settings?.superMode || false;
    const isCover = settings?.coverMode || false;
    
    // Cannot be both super and cover (for now)
    if (isSuper && isCover) {
        // Fallback or prioritize one. Let's say Super overrides Cover if both checked (UI should prevent this)
        // Or just let them be mutually exclusive in logic.
    }

    const initialBigPieces = isCover ? {
        [players[0].id]: 3,
        [players[1].id]: 3
    } : undefined;

    return {
      id: '', 
      type: 'tictactoe',
      players: players,
      status: 'playing',
      winner: null,
      currentTurn: players[0].id,
      gameData: {
        board: Array(isSuper ? 81 : 9).fill(null),
        superMode: isSuper,
        coverMode: isCover,
        activeGrid: null, 
        gridWinners: isSuper ? Array(9).fill(null) : undefined,
        bigPiecesLeft: initialBigPieces
      } as TicTacToeData,
    };
  }

  makeMove(state: GameState, playerId: string, move: { index: number }): GameState {
    const data = state.gameData as TicTacToeData;
    const { index } = move;

    if (state.status !== 'playing') return state;
    if (state.currentTurn !== playerId) return state;
    
    // ---------------- SUPER MODE LOGIC ----------------
    if (data.superMode) {
        // Validate Move
        if (data.board[index] !== null) return state;
        
        // Calculate which large grid this index belongs to
        const gridIndex = Math.floor(index / 9);
        
        // If activeGrid is set, move MUST be in that grid
        if (data.activeGrid !== null && data.activeGrid !== gridIndex) {
            return state;
        }
        
        // Check if the target small grid is already won/full
        if (data.gridWinners && data.gridWinners[gridIndex] !== null) {
             return state;
        }
        
        // Check if grid is full
        const start = gridIndex * 9;
        const gridCells = data.board.slice(start, start + 9);
        if (gridCells.every(c => c !== null)) return state;

        // Apply Move
        const symbol = state.players[0].id === playerId ? 'X' : 'O';
        const newBoard = [...data.board];
        newBoard[index] = symbol;
        
        let newGridWinners = data.gridWinners ? [...data.gridWinners] : undefined;
        let nextActiveGrid: number | null = null;

        // 1. Check if this move won the small grid
        if (newGridWinners && newGridWinners[gridIndex] === null) {
             const start = gridIndex * 9;
             const win = this.checkSmallGridWin(newBoard, start);
             if (win) {
                 newGridWinners[gridIndex] = win;
             } else {
                 // Check draw (full)
                 const gridSlice = newBoard.slice(start, start + 9);
                 if (gridSlice.every(c => c !== null)) {
                     newGridWinners[gridIndex] = 'D'; 
                 }
             }
        }
        
        // 2. Calculate Next Active Grid
        const localIndex = index % 9;
        nextActiveGrid = localIndex;
        
        // 3. Check if target grid is valid (not won/full)
        if (newGridWinners && newGridWinners[nextActiveGrid] !== null) {
            nextActiveGrid = null; // Free move
        }

        const newState = {
          ...state,
          gameData: { 
              ...data, 
              board: newBoard, 
              gridWinners: newGridWinners,
              activeGrid: nextActiveGrid
          },
        };
        return this.finalizeTurn(newState, playerId);
    } 
    // ---------------- COVER MODE LOGIC ----------------
    else if (data.coverMode) {
        const currentCell = data.board[index];
        const symbolBase = state.players[0].id === playerId ? 'X' : 'O';
        let newSymbol = '';
        const newBigPiecesLeft = { ...data.bigPiecesLeft };
        
        // Rule: 
        // 1. Empty -> Place Small
        // 2. Has Small -> Place Big (Cover) (Requires Big Piece)
        // 3. Has Big -> Invalid
        
        if (currentCell === null) {
            newSymbol = `${symbolBase}-S`;
        } else if (currentCell.endsWith('-S')) {
            // Check if player has big pieces left
            const piecesLeft = newBigPiecesLeft[playerId] || 0;
            if (piecesLeft > 0) {
                newSymbol = `${symbolBase}-B`;
                newBigPiecesLeft[playerId] = piecesLeft - 1;
            } else {
                return state; // No big pieces left
            }
        } else {
            return state; // Cannot cover Big
        }

        const newBoard = [...data.board];
        newBoard[index] = newSymbol;
        
        const newState = {
            ...state,
            gameData: {
                ...data,
                board: newBoard,
                bigPiecesLeft: newBigPiecesLeft
            }
        };
        return this.finalizeTurn(newState, playerId);
    }
    // ---------------- NORMAL MODE LOGIC ----------------
    else {
        if (data.board[index] !== null) return state;
        
        const symbol = state.players[0].id === playerId ? 'X' : 'O';
        const newBoard = [...data.board];
        newBoard[index] = symbol;

        const newState = {
            ...state,
            gameData: { ...data, board: newBoard }
        };
        return this.finalizeTurn(newState, playerId);
    }
  }
  
  private finalizeTurn(state: GameState, playerId: string): GameState {
      const winResult = this.checkWin(state);
      state.status = winResult.status;
      state.winner = winResult.winner;

      if (state.status === 'playing') {
          const nextPlayerIndex = (state.players.findIndex((p) => p.id === playerId) + 1) % state.players.length;
          state.currentTurn = state.players[nextPlayerIndex].id;
      }
      return state;
  }
  
  private checkSmallGridWin(board: (string|null)[], startOffset: number): string | null {
      const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6]
      ];
      
      for (const line of lines) {
          const [a, b, c] = line;
          const valA = board[startOffset + a];
          const valB = board[startOffset + b];
          const valC = board[startOffset + c];
          if (valA && valA === valB && valA === valC) {
              return valA;
          }
      }
      return null;
  }

  checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
    const data = state.gameData as TicTacToeData;
    
    if (data.superMode && data.gridWinners) {
        // ... (Existing Super Mode Win Logic)
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6]
        ];
        
        for (const line of lines) {
            const [a, b, c] = line;
            const valA = data.gridWinners[a];
            const valB = data.gridWinners[b];
            const valC = data.gridWinners[c];
            
            if (valA && valA !== 'D' && valA === valB && valA === valC) {
                 const winnerIndex = valA === 'X' ? 0 : 1;
                 return { winner: state.players[winnerIndex]?.id || 'unknown', status: 'finished' };
            }
        }
        
        const allDecided = data.gridWinners.every(w => w !== null);
        if (allDecided) {
            let xCount = 0;
            let oCount = 0;
            data.gridWinners.forEach(w => {
                if (w === 'X') xCount++;
                if (w === 'O') oCount++;
            });
            
            if (xCount > oCount) return { winner: state.players[0].id, status: 'finished' };
            if (oCount > xCount) return { winner: state.players[1].id, status: 'finished' };
            return { winner: 'draw', status: 'finished' };
        }
        
        return { winner: null, status: 'playing' };
        
    } else {
        // Normal OR Cover Mode
        // For Cover Mode, we need to extract the base symbol (X or O) from "X-S", "X-B"
        const board = data.board.map(c => c ? c.split('-')[0] : null); // "X-S" -> "X"
        
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6]
        ];

        for (let i = 0; i < lines.length; i++) {
          const [a, b, c] = lines[i];
          if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            const symbol = board[a];
            const winnerIndex = symbol === 'X' ? 0 : 1;
            return { winner: state.players[winnerIndex]?.id || 'unknown', status: 'finished' };
          }
        }

        if (board.every((cell) => cell !== null)) {
            // Check for draw
            // In Cover mode, even if full, maybe someone can cover?
            // "board full" means every cell is occupied.
            // If Cover mode, if ANY cell is 'Small', it's NOT a draw technically, 
            // unless players run out of Big pieces.
            if (data.coverMode) {
                 const hasSmall = data.board.some(c => c && c.endsWith('-S'));
                 const p1Big = data.bigPiecesLeft?.[state.players[0].id] || 0;
                 const p2Big = data.bigPiecesLeft?.[state.players[1].id] || 0;
                 
                 // If there are small pieces AND at least one player has big pieces, it's not over.
                 // BUT, simplifying: if board full and no winner, it's usually draw.
                 // However, "Draw" in cover mode is rare.
                 // Let's stick to simple "Board Full = Draw" for now, 
                 // OR check if any move is possible.
                 // If current player has Big pieces and there is a Small piece, they can move.
                 
                 // Let's just use "Full = Draw" for simplicity unless requested otherwise.
                 // Actually, if full of Big pieces -> Draw.
                 // If full but some Small -> Move possible?
                 
                 // Improved Draw Check for Cover Mode:
                 // If NO move is possible for CURRENT player?
                 // That's complex. Let's stick to "All cells occupied = Draw" for standard,
                 // but for Cover, maybe wait until all Big pieces used?
                 // Let's assume standard draw condition: All cells occupied.
                 // Wait, if I fill board with smalls, I can still cover.
                 // So "All cells occupied" is NOT a draw condition in Cover mode.
                 
                 // Real Draw Condition: No one can make a move.
                 // 1. Board is full of Big pieces (cannot cover).
                 // 2. OR Board is full, and players have no Big pieces left.
                 
                 const allBig = data.board.every(c => c && c.endsWith('-B'));
                 const noBigLeft = (p1Big === 0 && p2Big === 0);
                 
                 if (allBig || noBigLeft) {
                     return { winner: 'draw', status: 'finished' };
                 }
                 return { winner: null, status: 'playing' };
            }
            
            return { winner: 'draw', status: 'finished' };
        }

        return { winner: null, status: 'playing' };
    }
  }

  getBotMove(state: GameState, botId: string): any | null {
      return getBotMove(state, botId);
  }
}

const logic = new TicTacToe();
export default logic;
