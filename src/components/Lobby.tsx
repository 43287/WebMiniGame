import React, { useState } from 'react';
import { Button, Card } from './ui';
import { GameType } from '../types';

interface LobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

export function Lobby({ onCreateRoom, onJoinRoom, initialRoomId = '', savedName = '' }: LobbyProps & { initialRoomId?: string, savedName?: string }) {
  const [playerName, setPlayerName] = useState(savedName);
  const [roomId, setRoomId] = useState(initialRoomId);

  // Update state if props change (e.g. from URL)
  React.useEffect(() => {
    if (initialRoomId) setRoomId(initialRoomId);
  }, [initialRoomId]);

  React.useEffect(() => {
    if (savedName) setPlayerName(savedName);
  }, [savedName]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-4 font-sans">
      <h1 className="text-6xl font-black mb-12 text-black drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)] rotate-[-2deg]">
        涂鸦游戏大厅
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Create Room Section */}
        <Card className="flex flex-col gap-6 rotate-1 hover:rotate-0 transition-transform duration-300">
          <h2 className="text-3xl font-bold border-b-2 border-black pb-2">创建房间</h2>
          
          <div className="space-y-2">
            <label className="font-bold text-lg">你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border-2 border-black rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              placeholder="输入名字..."
            />
          </div>

          <Button
            onClick={() => {
              if (playerName) onCreateRoom(playerName);
            }}
            disabled={!playerName}
            className="w-full mt-4"
          >
            创建游戏!
          </Button>
        </Card>

        {/* Join Room Section */}
        <Card className="flex flex-col gap-6 rotate-[-1deg] hover:rotate-0 transition-transform duration-300">
          <h2 className="text-3xl font-bold border-b-2 border-black pb-2">加入房间</h2>
          
          <div className="space-y-2">
            <label className="font-bold text-lg">你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border-2 border-black rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              placeholder="输入名字..."
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold text-lg">房间号</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full border-2 border-black rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              placeholder="输入6位代码..."
            />
          </div>

          <Button
            onClick={() => {
              if (playerName && roomId) onJoinRoom(roomId, playerName);
            }}
            disabled={!playerName || !roomId}
            variant="secondary"
            className="w-full mt-auto"
          >
            加入游戏!
          </Button>
        </Card>
      </div>
    </div>
  );
}
