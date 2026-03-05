
import React from 'react';
import { cn } from '../../../components/ui.tsx';
import { BasePlayer } from '../types.ts';

interface PlayerAvatarProps {
    player: BasePlayer;
    isCurrentTurn?: boolean;
    cardCount?: number;
    statusText?: string;
    statusColor?: 'red' | 'yellow' | 'green' | 'blue';
    className?: string;
    children?: React.ReactNode; // For extra indicators like UNO shout or Chat bubble
}

export function PlayerAvatar({ 
    player, 
    isCurrentTurn, 
    cardCount, 
    statusText, 
    statusColor = 'red',
    className,
    children
}: PlayerAvatarProps) {
    return (
        <div className={cn("relative group", className)}>
            <div className={cn(
                "flex flex-col items-center p-2 rounded-lg border-2 border-black bg-white transition-all w-24",
                isCurrentTurn ? "scale-110 shadow-[4px_4px_0px_0px_rgba(255,200,0,1)] bg-yellow-50 z-10" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            )}>
                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-black mb-1 flex items-center justify-center font-bold overflow-hidden">
                    {player.avatar ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover"/> : player.name[0]}
                </div>
                <span className="font-bold text-sm truncate w-full text-center">{player.name}</span>
                
                {cardCount !== undefined && (
                    <div className="mt-2 font-black text-xl flex items-center gap-1">
                        <span className="text-2xl">🎴</span> {cardCount}
                    </div>
                )}
                
                {statusText && (
                    <div className={cn(
                        "absolute -top-3 -right-3 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-black animate-bounce",
                        statusColor === 'red' && "bg-red-500",
                        statusColor === 'yellow' && "bg-yellow-500",
                        statusColor === 'green' && "bg-green-500",
                        statusColor === 'blue' && "bg-blue-500"
                    )}>
                        {statusText}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
