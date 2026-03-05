
import { GameState } from '../../types.ts';
import { TicTacToeData } from './logic.ts';

// -------------------- Common Utils --------------------

type PlayerSymbol = 'X' | 'O';

function getSymbol(state: GameState, botId: string): PlayerSymbol {
    // Assuming player 0 is always 'X' and player 1 is 'O' based on logic.ts
    return state.players[0].id === botId ? 'X' : 'O';
}

function getOpponentSymbol(symbol: PlayerSymbol): PlayerSymbol {
    return symbol === 'X' ? 'O' : 'X';
}

function checkLine(a: string | null, b: string | null, c: string | null): string | null {
    if (a && a === b && a === c) return a;
    return null;
}

// Check winner for a 9-cell array (returns 'X', 'O', or null)
// Supports Cover Mode (parses "X-S", "X-B")
function checkGridWinner(cells: (string | null)[]): string | null {
    // Clean cells for Cover Mode
    const cleanCells = cells.map(c => c ? c.split('-')[0] : null);

    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
        const winner = checkLine(cleanCells[a], cleanCells[b], cleanCells[c]);
        if (winner) return winner;
    }
    return null;
}

// -------------------- Normal Mode (Minimax) --------------------

function minimax(board: (string | null)[], depth: number, isMaximizing: boolean, botSymbol: PlayerSymbol, alpha: number, beta: number): number {
    const winner = checkGridWinner(board);
    if (winner === botSymbol) return 10 - depth;
    if (winner === getOpponentSymbol(botSymbol)) return depth - 10;
    if (board.every(c => c !== null)) return 0; // Draw

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = botSymbol;
                const evalScore = minimax(board, depth + 1, false, botSymbol, alpha, beta);
                board[i] = null;
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        const opponentSymbol = getOpponentSymbol(botSymbol);
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = opponentSymbol;
                const evalScore = minimax(board, depth + 1, true, botSymbol, alpha, beta);
                board[i] = null;
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
        }
        return minEval;
    }
}

function getBestMoveNormal(board: (string | null)[], botSymbol: PlayerSymbol): number {
    let bestScore = -Infinity;
    let bestMove = -1;
    
    // If empty board, take center or corner to save time
    const emptyCount = board.filter(c => c === null).length;
    if (emptyCount === 9) return 4; // Center
    if (emptyCount === 8 && board[4] === null) return 4; // If opponent didn't take center, take it

    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = botSymbol;
            const score = minimax(board, 0, false, botSymbol, -Infinity, Infinity);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    // Fallback if something weird happens
    if (bestMove === -1) {
        const available = board.map((c, i) => c === null ? i : null).filter((i): i is number => i !== null);
        return available[Math.floor(Math.random() * available.length)];
    }
    
    return bestMove;
}


// -------------------- Super Mode (Heuristic) --------------------

// Evaluate a small grid for the bot
function evaluateSmallGrid(cells: (string | null)[], botSymbol: PlayerSymbol): number {
    const winner = checkGridWinner(cells);
    if (winner === botSymbol) return 100;
    if (winner === getOpponentSymbol(botSymbol)) return -100;
    
    // Heuristic: Count lines that are almost complete
    let score = 0;
    const opponentSymbol = getOpponentSymbol(botSymbol);
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
        const line = [cells[a], cells[b], cells[c]];
        const botCount = line.filter(c => c === botSymbol).length;
        const oppCount = line.filter(c => c === opponentSymbol).length;

        if (botCount === 2 && oppCount === 0) score += 10; // Threat to win
        if (botCount === 1 && oppCount === 0) score += 1;  // Potential
        if (oppCount === 2 && botCount === 0) score -= 10; // Threat to lose
        if (oppCount === 1 && botCount === 0) score -= 1;  // Potential loss
    }
    
    // Center control
    if (cells[4] === botSymbol) score += 5;
    if (cells[4] === opponentSymbol) score -= 5;

    return score;
}

function getBestMoveSuper(data: TicTacToeData, botSymbol: PlayerSymbol): number {
    const board = data.board;
    const gridWinners = data.gridWinners || Array(9).fill(null);
    const activeGrid = data.activeGrid;
    const opponentSymbol = getOpponentSymbol(botSymbol);

    // Determine valid target grids
    let targetGrids: number[] = [];
    if (activeGrid !== null && activeGrid !== undefined) {
        targetGrids = [activeGrid];
    } else {
        // Free move: any non-won/full grid
        targetGrids = Array.from({ length: 9 }, (_, i) => i)
            .filter(i => gridWinners[i] === null);
    }

    let bestScore = -Infinity;
    let bestMoves: number[] = [];

    // Iterate all valid moves
    for (const gridIndex of targetGrids) {
        const start = gridIndex * 9;
        for (let i = 0; i < 9; i++) {
            const globalIndex = start + i;
            if (board[globalIndex] !== null) continue;

            // Simulate Move
            // 1. Score based on local grid impact
            let moveScore = 0;
            
            // Clone small grid to check for immediate win
            const smallGrid = board.slice(start, start + 9);
            smallGrid[i] = botSymbol;
            const newWinner = checkGridWinner(smallGrid);
            
            if (newWinner === botSymbol) {
                moveScore += 500; // Winning a small grid is very good
                
                // Check if this helps win the BIG grid
                const bigGrid = [...gridWinners];
                bigGrid[gridIndex] = botSymbol;
                const bigWinner = checkGridWinner(bigGrid);
                if (bigWinner === botSymbol) moveScore += 10000; // Winning the GAME is best
            }

            // 2. Score based on where we send the opponent (Next Active Grid)
            const nextGridIndex = i; // The local index becomes the next grid index
            const nextGridStatus = gridWinners[nextGridIndex];
            
            if (nextGridStatus !== null) {
                // Sending opponent to a full/won grid gives them FREE MOVE.
                // This is generally BAD unless we just won the game.
                moveScore -= 500; 
            } else {
                // We are sending opponent to 'nextGridIndex'. 
                // Is that grid good for them?
                const nextGridCells = board.slice(nextGridIndex * 9, nextGridIndex * 9 + 9);
                const oppScoreInNextGrid = evaluateSmallGrid(nextGridCells, opponentSymbol);
                
                // If the next grid is advantageous for opponent, that's bad for us.
                // Subtract their potential score.
                moveScore -= oppScoreInNextGrid * 2; 
            }

            // 3. Positional Bonus
            // Center of small grid
            if (i === 4) moveScore += 10;
            // Corners
            if ([0, 2, 6, 8].includes(i)) moveScore += 5;

            // Update Best
            if (moveScore > bestScore) {
                bestScore = moveScore;
                bestMoves = [globalIndex];
            } else if (moveScore === bestScore) {
                bestMoves.push(globalIndex);
            }
        }
    }

    if (bestMoves.length === 0) return -1; // Should not happen
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// -------------------- Cover Mode (BFS / Max-N) --------------------

interface BFSState {
    board: (string | null)[];
    bigPieces: { me: number, opp: number };
    turn: 'me' | 'opp';
    lastMove: number;
}

function evaluateBoard(board: (string | null)[], meSymbol: PlayerSymbol, oppSymbol: PlayerSymbol, bigPieces: { me: number, opp: number }): number {
    const winner = checkGridWinner(board);
    if (winner === meSymbol) return 10000;
    if (winner === oppSymbol) return -10000;

    let score = 0;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // Evaluate Lines
    for (const [a, b, c] of lines) {
        const line = [board[a], board[b], board[c]].map(c => c ? c.split('-')[0] : null);
        const meCount = line.filter(c => c === meSymbol).length;
        const oppCount = line.filter(c => c === oppSymbol).length;

        // Threat Assessment
        if (meCount === 2 && oppCount === 0) score += 100;
        if (oppCount === 2 && meCount === 0) score -= 100;
        if (meCount === 1 && oppCount === 0) score += 10;
        if (oppCount === 1 && meCount === 0) score -= 10;
    }

    // Material Advantage (Big Pieces)
    score += (bigPieces.me - bigPieces.opp) * 20;

    // Center Control
    const center = board[4] ? board[4].split('-')[0] : null;
    if (center === meSymbol) score += 15;
    if (center === oppSymbol) score -= 15;

    return score;
}

function getValidMovesCover(board: (string | null)[], piecesLeft: number, symbol: PlayerSymbol): number[] {
    const moves: number[] = [];
    for (let i = 0; i < 9; i++) {
        const cell = board[i];
        if (cell === null) {
            moves.push(i); // Place Small
        } else if (piecesLeft > 0 && cell.endsWith('-S')) {
            moves.push(i); // Cover with Big
        }
    }
    return moves;
}

function bfsCover(data: TicTacToeData, botSymbol: PlayerSymbol, botId: string, opponentId: string): number {
    const MAX_DEPTH = 5; // Increased depth to 5
    const opponentSymbol = getOpponentSymbol(botSymbol);
    
    const rootState: BFSState = {
        board: [...data.board],
        bigPieces: {
            me: data.bigPiecesLeft?.[botId] || 0,
            opp: data.bigPiecesLeft?.[opponentId] || 0
        },
        turn: 'me',
        lastMove: -1
    };

    let bestScore = -Infinity;
    let bestMove = -1;
    
    const moves = getValidMovesCover(rootState.board, rootState.bigPieces.me, botSymbol);
    if (moves.length === 0) return -1;

    for (const move of moves) {
        const nextBoard = [...rootState.board];
        const isCover = nextBoard[move] !== null;
        nextBoard[move] = isCover ? `${botSymbol}-B` : `${botSymbol}-S`;
        
        const nextBigPieces = { ...rootState.bigPieces };
        if (isCover) nextBigPieces.me--;

        const score = minimaxCover(nextBoard, 1, false, botSymbol, opponentSymbol, nextBigPieces, -Infinity, Infinity, MAX_DEPTH);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function minimaxCover(
    board: (string | null)[], 
    depth: number, 
    isMaximizing: boolean, 
    meSymbol: PlayerSymbol, 
    oppSymbol: PlayerSymbol, 
    bigPieces: { me: number, opp: number },
    alpha: number, 
    beta: number,
    maxDepth: number
): number {
    const winner = checkGridWinner(board);
    if (winner === meSymbol) return 10000 - depth;
    if (winner === oppSymbol) return -10000 + depth;
    if (depth >= maxDepth) return evaluateBoard(board, meSymbol, oppSymbol, bigPieces);

    const currentSymbol = isMaximizing ? meSymbol : oppSymbol;
    const currentPieces = isMaximizing ? bigPieces.me : bigPieces.opp;
    const moves = getValidMovesCover(board, currentPieces, currentSymbol);

    if (moves.length === 0) return 0; // Draw or Stuck

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextBoard = [...board];
            const isCover = nextBoard[move] !== null;
            nextBoard[move] = isCover ? `${meSymbol}-B` : `${meSymbol}-S`;
            
            const nextBigPieces = { ...bigPieces };
            if (isCover) nextBigPieces.me--;

            const evalScore = minimaxCover(nextBoard, depth + 1, false, meSymbol, oppSymbol, nextBigPieces, alpha, beta, maxDepth);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nextBoard = [...board];
            const isCover = nextBoard[move] !== null;
            nextBoard[move] = isCover ? `${oppSymbol}-B` : `${oppSymbol}-S`;
            
            const nextBigPieces = { ...bigPieces };
            if (isCover) nextBigPieces.opp--;

            const evalScore = minimaxCover(nextBoard, depth + 1, true, meSymbol, oppSymbol, nextBigPieces, alpha, beta, maxDepth);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}


// -------------------- Main Entry --------------------

export function getBotMove(state: GameState, botId: string): { index: number } | null {
    const data = state.gameData as TicTacToeData;
    const botSymbol = getSymbol(state, botId);

    // Safety check
    if (state.status !== 'playing') return null;

    if (data.superMode) {
        const moveIndex = getBestMoveSuper(data, botSymbol);
        if (moveIndex === -1) return null; 
        return { index: moveIndex };
    } 
    else if (data.coverMode) {
        // Find opponent ID
        const opponent = state.players.find(p => p.id !== botId);
        const opponentId = opponent ? opponent.id : 'unknown';
        
        const moveIndex = bfsCover(data, botSymbol, botId, opponentId);
        if (moveIndex === -1) return null;
        return { index: moveIndex };
    }
    else {
        // Normal Mode: Use Minimax
        const boardClone = [...data.board];
        const moveIndex = getBestMoveNormal(boardClone, botSymbol);
        if (moveIndex === -1 || data.board[moveIndex] !== null) {
             // Fallback
             const available = data.board.map((c, i) => c === null ? i : null).filter((i): i is number => i !== null);
             if (available.length === 0) return null;
             return { index: available[Math.floor(Math.random() * available.length)] };
        }
        return { index: moveIndex };
    }
}
