import React from 'react';
import { TicTacToeData } from '../logic.ts';
import { GameState } from '../../../types.ts';
import { cn } from '../../../components/ui.tsx';

interface TicTacToeBoardProps {
  gameState: GameState;
  currentPlayerId: string;
  onMakeMove: (move: { index: number }) => void;
}

export default function TicTacToeBoard({ gameState, currentPlayerId, onMakeMove }: TicTacToeBoardProps) {
  const data = gameState.gameData as any as TicTacToeData; 
  const isMyTurn = gameState.currentTurn === currentPlayerId;
  const isSuper = !!data.superMode;
  const isCover = !!data.coverMode;

  const renderNormalBoard = () => (
    <div className="grid grid-cols-3 gap-4 bg-white p-4 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {data.board.slice(0, 9).map((cell, index) => {
          // Parse cell for Cover mode
          // cell can be "X", "O" (Normal) or "X-S", "X-B" (Cover)
          let displaySymbol = cell;
          let isSmall = false;
          let isBig = false;
          
          if (isCover && cell) {
              const [sym, size] = cell.split('-');
              displaySymbol = sym;
              isSmall = size === 'S';
              isBig = size === 'B';
          }

          // Check if coverable
          // Can cover if: My Turn AND (Empty OR (IsSmall AND I Have Big Pieces))
          const myBigPieces = data.bigPiecesLeft?.[currentPlayerId] || 0;
          const canCover = isCover && isMyTurn && cell && isSmall && myBigPieces > 0 && gameState.status === 'playing';
          const canPlace = isMyTurn && !cell && gameState.status === 'playing';
          
          return (
            <button
              key={index}
              onClick={() => {
                if (canPlace || canCover) {
                  onMakeMove({ index });
                }
              }}
              disabled={!(canPlace || canCover)}
              className={cn(
                "w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 border-2 border-black rounded-lg flex items-center justify-center transition-all relative overflow-hidden",
                "hover:bg-yellow-50 disabled:hover:bg-gray-50",
                displaySymbol === 'X' ? "text-blue-500" : "text-red-500",
                (canPlace || canCover) ? "cursor-pointer hover:scale-105" : "cursor-default"
              )}
            >
              <span className={cn(
                  "font-black transition-all",
                  isSmall ? "text-4xl opacity-80" : "text-7xl drop-shadow-md", // Small vs Big size
                  isCover && !cell && canPlace ? "opacity-0 hover:opacity-30 text-4xl text-black" : "" // Hover hint? Maybe not needed
              )}>
                  {displaySymbol}
              </span>
              
              {/* Cover Hint Overlay */}
              {canCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold bg-white px-1 rounded border border-black text-black">
                          覆盖!
                      </span>
                  </div>
              )}
            </button>
          );
      })}
    </div>
  );

  const renderSuperBoard = () => {
      // ... (Existing Super Board Logic - kept same but wrapped for clarity)
      // 9 Large Grids (0-8)
      const grids = Array(9).fill(null).map((_, gridIndex) => {
          const isActive = data.activeGrid === null || data.activeGrid === gridIndex;
          const winner = data.gridWinners?.[gridIndex];
          const isWon = winner !== null && winner !== undefined;
          
          return (
              <div 
                key={gridIndex} 
                className={cn(
                    "relative grid grid-cols-3 gap-1 p-2 border-2 rounded-lg transition-all",
                    isActive && !isWon && isMyTurn ? "bg-yellow-100 ring-4 ring-yellow-400 z-10 scale-105 shadow-lg" : "bg-white border-black",
                    isWon ? (winner === 'X' ? "bg-blue-50" : winner === 'O' ? "bg-red-50" : "bg-gray-200") : ""
                )}
              >
                  {/* Grid Cells */}
                  {Array(9).fill(null).map((_, localIndex) => {
                      const globalIndex = gridIndex * 9 + localIndex;
                      const cell = data.board[globalIndex];
                      
                      return (
                          <button
                            key={globalIndex}
                            onClick={() => {
                                if (isMyTurn && !cell && isActive && !isWon && gameState.status === 'playing') {
                                    onMakeMove({ index: globalIndex });
                                }
                            }}
                            disabled={!isMyTurn || !!cell || !isActive || isWon || gameState.status !== 'playing'}
                            className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 border border-black/20 rounded flex items-center justify-center text-xl font-bold transition-colors",
                                !cell && isMyTurn && isActive && !isWon ? "hover:bg-yellow-200 cursor-pointer" : "cursor-default",
                                cell === 'X' ? "text-blue-600" : "text-red-600"
                            )}
                          >
                              {cell}
                          </button>
                      );
                  })}
                  
                  {/* Large Winner Overlay */}
                  {isWon && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-lg">
                          <span className={cn(
                              "text-6xl sm:text-8xl font-black drop-shadow-md",
                              winner === 'X' ? "text-blue-600" : winner === 'O' ? "text-red-600" : "text-gray-600"
                          )}>
                              {winner === 'D' ? 'Draw' : winner}
                          </span>
                      </div>
                  )}
              </div>
          );
      });

      return (
          <div className="grid grid-cols-3 gap-4 bg-white p-4 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {grids}
          </div>
      );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-8">
      {isSuper ? renderSuperBoard() : renderNormalBoard()}
      
      {/* Game Status & Info */}
      <div className="flex flex-col gap-4 items-center">
          {gameState.status === 'playing' && (
            <div className="text-2xl font-bold bg-white border-2 border-black px-6 py-2 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {isMyTurn ? (
                  isSuper && data.activeGrid !== null ? "你的回合! (请在指定区域落子)" : "你的回合!"
              ) : "等待对手..."}
            </div>
          )}
          
          {/* Cover Mode Resources */}
          {isCover && (
              <div className="flex gap-8">
                  {gameState.players.map(p => {
                      const isMe = p.id === currentPlayerId;
                      const pieces = data.bigPiecesLeft?.[p.id] || 0;
                      const symbol = gameState.players[0].id === p.id ? 'X' : 'O';
                      
                      return (
                          <div key={p.id} className={cn(
                              "flex flex-col items-center p-3 border-2 rounded-lg bg-white shadow-sm transition-all",
                              isMe ? "border-black scale-105" : "border-gray-200 opacity-80"
                          )}>
                              <div className="text-xs font-bold text-gray-500 mb-1">{p.name} ({symbol})</div>
                              <div className="flex items-center gap-2">
                                  <span className="text-3xl">🗳️</span>
                                  <span className="text-2xl font-black">x {pieces}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold mt-1">大标志剩余</div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
}
