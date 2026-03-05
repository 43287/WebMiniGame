import React, { useState, useRef, useEffect } from 'react';
import { Room, GameState, Player, GameType } from '../types';
import { Button, Card } from './ui';
import { uiRegistry, manualRegistry } from '../games/uiRegistry';
import { DevGuide } from './DevGuide';
import { GameSettingsPanel } from './GameSettingsPanel';
import { ChatBubble } from './ChatBubble';
import { DebugConsole } from './DebugConsole';

interface GameRoomProps {
  room: Room;
  playerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onMakeMove: (move: any) => void;
  onSelectGame: (gameType: GameType) => void;
  onUpdateSettings: (settings: any) => void;
  onSendChat: (message: string) => void;
  socket: any;
}

const CHAT_MESSAGES = [
    "快点啊！",
    "打得不错！",
    "太悲伤了",
    "手下留情~",
    "我要赢了！",
    "失误了...",
    "哈哈哈哈！"
];

export function GameRoom({ room, playerId, onStartGame, onLeaveRoom, onAddBot, onRemoveBot, onMakeMove, onSelectGame, onUpdateSettings, onSendChat, socket }: GameRoomProps) {
  const isHost = room.players && room.players.length > 0 && room.players[0].id === playerId;
  const gameType = room.gameType;
  const [showDevGuide, setShowDevGuide] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const GameView = gameType ? uiRegistry[gameType] : null;
  const GameManual = gameType ? manualRegistry[gameType] : null;

  // Debug Logs
  const [logs, setLogs] = useState<{ timestamp: string; type: 'send' | 'receive' | 'info'; content: any }[]>([]);

  const addLog = (type: 'send' | 'receive' | 'info', content: any) => {
      setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          type,
          content
      }]);
  };

  const handleMakeMove = (move: any) => {
      if (move.action === 'chat') {
          onSendChat(move.message);
          addLog('send', { action: 'chat', message: move.message });
          return;
      }
      addLog('send', move);
      onMakeMove(move);
  };

  useEffect(() => {
      if (room.gameState) {
          addLog('receive', room.gameState);
      }
  }, [room.gameState]);

  const handleDebugCommand = (event: string, payload: any) => {
      addLog('send', { event, payload });
      socket.emit(event, payload);
  };

  const handleReturnToLobby = () => {
    socket.emit('returnToLobby');
  };

  return (
    <div className="flex flex-col h-screen bg-amber-50 font-sans overflow-hidden">
      <DevGuide isOpen={showDevGuide} onClose={() => setShowDevGuide(false)} />

      {/* Manual Modal */}
      {showManual && GameManual && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowManual(false)}>
            <div className="bg-white border-4 border-black rounded-xl w-full max-w-3xl h-[80vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b-4 border-black bg-yellow-300 flex justify-between items-center rounded-t-lg">
                    <h2 className="text-3xl font-black rotate-[-1deg]">📖 游戏说明书</h2>
                    <button onClick={() => setShowManual(false)} className="text-2xl font-black hover:scale-110 transition-transform">❌</button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <GameManual />
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t-4 border-black bg-gray-100 flex justify-end rounded-b-lg">
                    <Button onClick={() => setShowManual(false)}>我懂了!</Button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b-2 border-black p-2 md:p-4 flex flex-col md:flex-row justify-between items-center shadow-sm z-20 gap-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-black rotate-[-1deg]">
                {gameType === 'tictactoe' ? '井字棋' : gameType === 'uno' ? '优诺牌' : '游戏大厅'}
            </h1>
            <div className="bg-yellow-200 px-2 py-0.5 md:px-3 md:py-1 rounded-full border-2 border-black text-xs md:text-sm font-bold">
              房间: {room.id}
            </div>
          </div>
          
          {/* Mobile Menu Toggle or simplified actions could go here if needed */}
          <div className="md:hidden flex gap-2">
             <Button 
                variant="secondary" 
                className="py-1 px-2 text-xs bg-gray-100 border-gray-400"
                onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('roomId', room.id);
                    navigator.clipboard.writeText(url.toString());
                    alert('链接已复制!');
                }}
             >
                复制链接
             </Button>
             <Button variant="secondary" onClick={onLeaveRoom} className="py-1 px-2 text-xs bg-red-100 border-red-800 text-red-900">
                退出房间
             </Button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
            {GameManual && (
                <Button 
                  variant="secondary" 
                  onClick={() => setShowManual(true)}
                  className="py-1 px-3 text-sm bg-blue-100 hover:bg-blue-200 border-blue-800 text-blue-900 active:scale-95 transition-transform"
                >
                  📖 说明书
                </Button>
            )}
            <Button 
              variant="secondary" 
              className="py-1 px-2 text-xs active:scale-95 transition-transform"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('roomId', room.id);
                navigator.clipboard.writeText(url.toString());
                alert('链接已复制!');
              }}
            >
              🔗 复制链接
            </Button>
            
            {isHost && room.gameState && (
              <Button 
                variant="secondary" 
                onClick={handleReturnToLobby} 
                className="py-1 px-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 border-red-800 active:scale-95 transition-transform"
              >
                🛑 结束本局
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowDevGuide(true)} className="py-1 px-3 text-sm bg-gray-200">
              🛠️ 开发者指南
            </Button>
            <Button variant="secondary" onClick={onLeaveRoom} className="py-1 px-3 text-sm active:scale-95 transition-transform">
              离开房间
            </Button>
        </div>

        {/* Mobile secondary actions row */}
        <div className="flex md:hidden w-full justify-between items-center gap-2 border-t border-dashed border-gray-300 pt-2 mt-1">
             {GameManual && (
                <button 
                    onClick={() => setShowManual(true)} 
                    className="text-xs font-bold underline text-blue-600 active:text-blue-800 active:scale-95 transition-transform px-2 py-1 rounded hover:bg-blue-50"
                >
                    📖 规则
                </button>
            )}
            {isHost && room.gameState && (
                <button 
                    onClick={handleReturnToLobby} 
                    className="text-xs font-bold underline text-red-600 active:text-red-800 active:scale-95 transition-transform px-2 py-1 rounded hover:bg-red-50"
                >
                    🛑 结束本局
                </button>
            )}
        </div>
      </div>
      
      {/* Mobile Chat Menu - Moved to Root Level */}
      {showChatMenu && (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setShowChatMenu(false)} />
            <div className="fixed top-[130px] left-2 right-2 bg-white border-4 border-black rounded-xl p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-wrap gap-2 justify-center animate-in slide-in-from-top-2 fade-in duration-200 md:hidden">
                <div className="w-full text-center text-xs font-bold text-gray-500 mb-1">发送消息</div>
                {CHAT_MESSAGES.map((msg) => (
                    <button
                        key={msg}
                        onClick={() => {
                            onSendChat(msg);
                            setShowChatMenu(false);
                        }}
                        className="px-3 py-2 bg-yellow-300 border-2 border-black rounded-lg hover:bg-yellow-400 active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm transition-all"
                    >
                        {msg}
                    </button>
                ))}
                <button 
                    onClick={() => setShowChatMenu(false)}
                    className="w-full mt-2 text-xs underline text-gray-500"
                >
                    关闭
                </button>
            </div>
        </>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Mobile Player List (Top Scrollable) */}
        <div className="md:hidden bg-amber-50 border-b-4 border-black p-2 flex gap-3 overflow-x-auto whitespace-nowrap shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] z-10 min-h-[90px] items-center relative no-scrollbar">
            {room.players.map((player, index) => (
                <div 
                    key={player.id}
                    onClick={() => player.id === playerId && setShowChatMenu(!showChatMenu)}
                    className={`
                        inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl border-2 border-black transition-all relative min-w-[70px] shrink-0 h-[70px]
                        ${player.id === playerId ? 'bg-yellow-300 rotate-[-2deg] active:scale-95 cursor-pointer hover:bg-yellow-400' : 'bg-white rotate-[1deg]'}
                        ${player.id === room.gameState?.currentTurn ? 'ring-4 ring-blue-400 shadow-[4px_4px_0px_0px_rgba(0,0,255,0.2)] scale-110 z-10' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
                    `}
                    style={{ transform: player.id === room.gameState?.currentTurn ? 'scale(1.1) rotate(0deg)' : `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})` }}
                >
                    <div className="flex flex-col items-center gap-0">
                         {/* Avatar Placeholder / Initial */}
                         <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold mb-1 border border-white">
                             {player.name[0].toUpperCase()}
                         </div>
                         <span className="font-black text-xs truncate max-w-[60px] leading-tight">{player.name}</span>
                         {player.isBot && <span className="text-[9px] text-gray-500 font-bold bg-gray-200 px-1 rounded-full mt-0.5">BOT</span>}
                    </div>
                    
                    {room.gameState?.winner === player.id && (
                        <span className="absolute -top-3 -right-1 text-xl animate-bounce">👑</span>
                    )}
                    
                    {/* Mobile Remove Bot Button */}
                    {isHost && player.isBot && room.gameState?.status !== 'playing' && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBot(player.id);
                            }}
                            className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-black text-xs z-20 shadow-sm hover:scale-110 active:scale-90"
                        >
                            ✕
                        </button>
                    )}

                    {/* Mobile Chat Bubble */}
                    {player.chatMessage && (
                        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-max pointer-events-none whitespace-normal">
                            <ChatBubble message={player.chatMessage} />
                        </div>
                    )}
                </div>
            ))}
            
            {/* Mobile Add Bot Button */}
            {isHost && room.gameState?.status !== 'playing' && (
                <button 
                    onClick={onAddBot}
                    className="inline-flex flex-col items-center justify-center w-[50px] h-[50px] bg-gray-100 border-2 border-dashed border-gray-400 rounded-xl hover:bg-gray-200 text-gray-500 shrink-0 rotate-[3deg] active:scale-95 transition-transform"
                >
                    <span className="text-xl font-bold">+</span>
                    <span className="text-[10px] font-bold">BOT</span>
                </button>
            )}
        </div>

        {/* Desktop Sidebar (Players) */}
        <div className="w-64 bg-white border-r-2 border-black p-4 hidden md:flex flex-col gap-4 shadow-[4px_0px_0px_0px_rgba(0,0,0,1)] z-10 relative">
          <h2 className="font-bold text-xl border-b-2 border-black pb-2">玩家列表</h2>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {room.players.map((player) => (
              <div
                key={player.id}
                onClick={() => player.id === playerId && setShowChatMenu(!showChatMenu)}
                className={`p-3 rounded-lg border-2 border-black flex items-center justify-between relative transition-all ${
                  player.id === playerId ? 'bg-yellow-100 cursor-pointer hover:bg-yellow-200' : 'bg-gray-50'
                } ${player.id === room.gameState?.currentTurn ? 'ring-2 ring-blue-400 shadow-[2px_2px_0px_0px_rgba(0,0,255,0.2)]' : ''}`}
              >
                <div className="flex flex-col">
                    <span className="font-bold truncate max-w-[120px]">{player.name}</span>
                    {player.isBot && <span className="text-xs text-gray-500">机器人</span>}
                </div>
                
                {room.gameState?.winner === player.id && (
                  <span className="text-xl">👑</span>
                )}
                
                {isHost && player.isBot && room.gameState?.status !== 'playing' && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBot(player.id);
                        }}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 border border-red-800 rounded px-1.5 py-0.5 ml-2 transition-colors z-20 absolute right-2 top-2"
                        title="移除机器人"
                    >
                        ✕
                    </button>
                )}
                
                {/* Chat Bubble */}
                {player.chatMessage && (
                    <ChatBubble key={player.chatMessage} message={player.chatMessage} />
                )}
              </div>
            ))}
          </div>
          
          {/* Chat Menu Popover (Desktop) */}
          {showChatMenu && (
            <div className="absolute top-20 left-64 ml-2 bg-white border-2 border-black rounded-xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-col gap-2 w-40 md:flex hidden">
                {CHAT_MESSAGES.map((msg) => (
                    <button
                        key={msg}
                        onClick={() => {
                            onSendChat(msg);
                            setShowChatMenu(false);
                        }}
                        className="text-left px-3 py-2 hover:bg-yellow-100 rounded font-bold text-sm transition-colors"
                    >
                        {msg}
                    </button>
                ))}
            </div>
          )}
          
          {room.gameState?.status !== 'playing' && (
            <div className="flex flex-col gap-2">
              {isHost && (
                <Button onClick={onAddBot} variant="secondary" className="w-full">
                  添加机器人
                </Button>
              )}
            </div>
          )}

          {/* Debug Console */}
          <DebugConsole 
              logs={logs} 
              onSendCommand={handleDebugCommand} 
              gameState={room.gameState || null}
              gameType={room.gameType}
              currentPlayerId={playerId}
          />
        </div>

        {/* Main Game Area */}
        <div className="flex-1 bg-amber-50 p-4 overflow-auto flex items-center justify-center relative">
            
            {!gameType && isHost ? (
                <div className="flex flex-col gap-8 items-center">
                    <h2 className="text-4xl font-black rotate-[-2deg]">选择一个游戏</h2>
                    <div className="flex gap-6 flex-wrap justify-center">
                        <button
                            onClick={() => onSelectGame('tictactoe')}
                            className="w-64 h-40 bg-blue-300 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <span className="text-4xl">❌⭕</span>
                            <span className="text-2xl font-bold">井字棋</span>
                        </button>
                        <button
                            onClick={() => onSelectGame('uno')}
                            className="w-64 h-40 bg-red-300 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <span className="text-4xl">🃏</span>
                            <span className="text-2xl font-bold">优诺牌</span>
                        </button>
                        <button
                            onClick={() => onSelectGame('poker')}
                            className="w-64 h-40 bg-green-300 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <span className="text-4xl">♠️</span>
                            <span className="text-2xl font-bold">扑克</span>
                        </button>
                    </div>
                </div>
            ) : !gameType ? (
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4 rotate-[-2deg]">等待房主选择游戏...</h2>
                    <div className="text-6xl animate-spin">⏳</div>
                </div>
            ) : !room.gameState ? (
                // Settings Panel
                <div className="flex flex-col items-center gap-6 w-full">
                    {isHost && (
                        <div className="w-full flex justify-start mb-4">
                             <Button onClick={() => onSelectGame(null as any)} variant="secondary" className="text-sm">← 更换游戏</Button>
                        </div>
                    )}
                    <GameSettingsPanel 
                        room={room} 
                        isHost={isHost} 
                        onUpdateSettings={onUpdateSettings} 
                        onStartGame={onStartGame} 
                    />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col">
                    {GameView && room.gameState && (
                        <GameView
                            gameState={room.gameState}
                            currentPlayerId={playerId}
                            onMakeMove={handleMakeMove}
                        />
                    )}

                    {/* Game Over Overlay */}
                    {room.gameState.status === 'finished' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <Card className="p-8 flex flex-col items-center gap-6 animate-bounce">
                                <h2 className="text-4xl font-black text-center">
                                    {room.gameState.winner === 'draw' ? '平局!' : 
                                     room.gameState.winner === playerId ? '你赢了!' : 
                                     `${room.players.find(p => p.id === room.gameState?.winner)?.name} 赢了!`}
                                </h2>
                                {isHost && (
                                    <div className="flex gap-4">
                                        <Button onClick={onStartGame}>快速重开</Button>
                                        <Button onClick={handleReturnToLobby} variant="secondary">返回房间</Button>
                                    </div>
                                )}
                                {!isHost && (
                                    <p className="text-gray-500 font-bold">等待房主...</p>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
