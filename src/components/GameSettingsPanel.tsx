import React, { useState, useEffect } from 'react';
import { Button } from './ui';
import { Room } from '../types';
import { logicRegistry } from '../games/logicRegistry';
import { settingsRegistry } from '../games/uiRegistry';

interface GameSettingsPanelProps {
  room: Room;
  isHost: boolean;
  onUpdateSettings: (settings: any) => void;
  onStartGame: () => void;
}

export function GameSettingsPanel({ room, isHost, onUpdateSettings, onStartGame }: GameSettingsPanelProps) {
  const [settings, setSettings] = useState<any>(room.settings || {});
  const gameLogic = room.gameType ? logicRegistry[room.gameType] : null;
  const SettingsComponent = room.gameType ? settingsRegistry[room.gameType] : null;

  // Calculate dynamic min/max players if logic supports it
  // (Assuming PokerLogic has logic to update minPlayers based on settings, but here we just read static props or basic logic)
  // Note: For Poker, minPlayers changes based on rules. 
  // We can re-instantiate logic with current settings to check limits if needed, or rely on the logic's static properties if possible.
  // Ideally, the game logic should provide a helper to validate settings/players without instantiation.
  // For now, we will rely on a simple check or the existing logic instance.
  
  // However, we can't easily access the internal state of logic here without a clean API.
  // A temporary workaround for Poker (which has dynamic limits):
  // We will let the Settings component or Logic handle validation message if we want to be precise.
  // But to keep it simple and generic:
  let minPlayers = gameLogic?.minPlayers || 2;
  let maxPlayers = gameLogic?.maxPlayers || 10;
  
  // SPECIAL HANDLING FOR POKER (Backwards compatibility with previous hardcoded logic)
  // In a perfect world, logic.getLimits(settings) would exist.
  if (room.gameType === 'poker' && settings.rule) {
      // We can't easily import RULES here without coupling. 
      // So we will assume the default range [2, 10] is shown, 
      // or we accept that "Start" might fail if logic rejects it.
      // BUT, to be user friendly, we can try to guess.
      if (settings.rule === 'doudizhu') { minPlayers = 3; maxPlayers = 3; }
      if (settings.rule === 'zhajinhua') { minPlayers = 2; maxPlayers = 5; }
      // texas is 2-10
  }

  const currentPlayerCount = room.players.length;
  const canStart = currentPlayerCount >= minPlayers && currentPlayerCount <= maxPlayers;

  useEffect(() => {
    setSettings(room.settings || {});
  }, [room.settings]);

  const updateSetting = (key: string, value: any, sideEffects?: (s: any) => void) => {
      if (!isHost) return;
      let newSettings = { ...settings, [key]: value };
      if (sideEffects) {
          sideEffects(newSettings);
      }
      setSettings(newSettings);
      onUpdateSettings(newSettings);
  };

  const getHeaderColor = (type: string) => {
      switch(type) {
          case 'poker': return 'bg-green-300';
          case 'uno': return 'bg-yellow-300';
          case 'tictactoe': return 'bg-blue-300';
          default: return 'bg-gray-300';
      }
  };

  const getGameTitle = (type: string) => {
      switch(type) {
          case 'poker': return '扑克 规则设置';
          case 'uno': return 'UNO 规则设置';
          case 'tictactoe': return '井字棋设置';
          default: return '游戏设置';
      }
  };

  return (
    <div className="flex flex-col gap-8 items-center w-full max-w-4xl px-4">
      {/* Dynamic Header */}
      <div className="relative">
           <h2 className="text-4xl font-black rotate-[-2deg] bg-white px-6 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 relative">
              {getGameTitle(room.gameType || '')}
          </h2>
          <div className={`absolute inset-0 ${getHeaderColor(room.gameType || '')} border-4 border-black rotate-[2deg] translate-x-1 translate-y-1 -z-10`}></div>
      </div>

      {/* Dynamic Settings Component */}
      <div className="w-full flex justify-center">
          {SettingsComponent ? (
              <SettingsComponent 
                  settings={settings} 
                  isHost={isHost} 
                  onUpdateSettings={updateSetting} 
              />
          ) : (
              <div className="text-xl font-bold p-8 border-2 border-dashed border-black rounded-xl bg-gray-50">
                  此游戏暂无额外设置。
              </div>
          )}
      </div>

      {/* Start Button Area */}
      <div className="mt-8 flex flex-col items-center gap-4 relative group">
          {isHost ? (
              <>
                  <button
                      onClick={onStartGame}
                      disabled={!canStart}
                      className={`relative bg-green-400 text-black text-2xl font-black px-12 py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all rotate-[-1deg] hover:rotate-[0deg] disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:hover:rotate-[-1deg]`}
                  >
                      开始游戏! 🚀
                  </button>
                  {!canStart && (
                       <div className="text-red-600 font-bold animate-bounce">
                           需要 {minPlayers} - {maxPlayers} 人才能开始 (当前: {currentPlayerCount})
                       </div>
                  )}
              </>
          ) : (
               <div className="bg-white border-4 border-black px-8 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] rotate-[1deg]">
                  <span className="text-xl font-bold animate-pulse">⏳ 等待房主开始游戏...</span>
               </div>
          )}
      </div>
    </div>
  );
}
