
import React from 'react';
import { cn } from '../../../components/ui.tsx';

interface TableLayoutProps {
    children: React.ReactNode; // Center content (Deck, Pot, etc.)
    players: React.ReactNode[]; // Player components (Avatar + Info)
    myHand: React.ReactNode; // Hand component
    header?: React.ReactNode; // Optional header content (e.g. Landlord cards)
    className?: string;
    direction?: 'clockwise' | 'counter-clockwise'; // Game turn direction
    mode?: 'default' | 'side-by-side'; // Layout mode
}

export function TableLayout({ children, players, myHand, header, className, direction = 'counter-clockwise', mode = 'default' }: TableLayoutProps) {
    if (mode === 'side-by-side') {
        const [leftPlayer, rightPlayer] = players;
        
        return (
            <div className={cn("flex flex-col h-full w-full relative select-none overflow-hidden", className)}>
                {/* Direction Indicator */}
                <div className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 shadow-lg">
                    <span className="text-lg leading-none">{direction === 'clockwise' ? '↻' : '↺'}</span>
                    <span>{direction === 'clockwise' ? '顺时针' : '逆时针'}</span>
                </div>

                {/* Main Game Area */}
                <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 relative">
                    {/* Header Area */}
                    {header && (
                        <div className="flex justify-center mb-4 w-full relative z-20">
                            {header}
                        </div>
                    )}
                    
                    {/* Game Surface */}
                    <div className="flex-1 flex w-full relative">
                        {/* Left Player Area */}
                        <div className="flex flex-col justify-center items-start w-[120px] z-10">
                            {leftPlayer}
                        </div>

                        {/* Center Content */}
                        <div className="flex-1 flex items-center justify-center relative px-4">
                             {children}
                        </div>

                        {/* Right Player Area */}
                        <div className="flex flex-col justify-center items-end w-[120px] z-10">
                            {rightPlayer}
                        </div>
                    </div>
                </div>

                {/* My Hand Area (Full Width) */}
                <div className="w-full relative min-h-[180px] flex flex-col justify-end items-center pb-12">
                    {myHand}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full w-full relative select-none overflow-hidden", className)}>
            {/* Direction Indicator */}
            <div className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 shadow-lg">
                <span className="text-lg leading-none">{direction === 'clockwise' ? '↻' : '↺'}</span>
                <span>{direction === 'clockwise' ? '顺时针' : '逆时针'}</span>
            </div>

            {/* Main Game Area (Constrained Width) */}
            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4">
                {/* Header Area */}
                {header && (
                    <div className="flex justify-center mb-4 w-full">
                        {header}
                    </div>
                )}

                {/* Opponents Area */}
                <div className="flex justify-center gap-8 mb-4 flex-wrap min-h-[120px] px-8">
                    {players}
                </div>

                {/* Center Area (Table Surface - No Background) */}
                <div className="flex-1 flex items-center justify-center relative min-h-[200px] mb-4 mx-4">
                     {children}
                </div>
            </div>

            {/* My Hand Area (Full Width) */}
            <div className="w-full relative min-h-[180px] flex flex-col justify-end items-center pb-12">
                {myHand}
            </div>
        </div>
    );
}
