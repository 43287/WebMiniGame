
import React from 'react';
import { cn } from '../../../components/ui.tsx';
import { PokerCard as PokerCardType } from '../types.ts';
import { motion } from 'motion/react';

interface PokerCardProps {
  card: PokerCardType;
  onClick?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  className?: string;
  faceDown?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
  none: '🃏' // Joker
};

const SUIT_COLORS: Record<string, string> = {
  spades: 'text-black',
  hearts: 'text-red-600',
  clubs: 'text-black',
  diamonds: 'text-red-600',
  none: 'text-purple-700'
};

const RANK_SYMBOLS: Record<string, string> = {
  'Joker_Black': 'Joker',
  'Joker_Red': 'JOKER',
  'A': 'A',
  'K': 'K',
  'Q': 'Q',
  'J': 'J',
  '10': '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2'
};

export function PokerCard({ 
  card, 
  onClick, 
  disabled, 
  isSelected, 
  isPlayable = true,
  className,
  faceDown = false
}: PokerCardProps) {
  
  if (faceDown) {
      return (
        <motion.div
            whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={!disabled ? onClick : undefined}
            className={cn(
                "w-20 h-32 sm:w-24 sm:h-36 rounded-xl border-2 border-black bg-blue-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden select-none cursor-pointer",
                disabled && "cursor-not-allowed opacity-80",
                className
            )}
        >
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="text-4xl font-black text-white rotate-45">POKER</span>
            </div>
            {/* Pattern */}
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
        </motion.div>
      );
  }

  const symbol = card.rank.toString().startsWith('Joker') ? '🃏' : SUIT_SYMBOLS[card.suit];
  const rankText = RANK_SYMBOLS[card.rank.toString()] || card.rank;
  const colorClass = card.rank.toString() === 'Joker_Red' ? 'text-red-600' : (card.rank.toString() === 'Joker_Black' ? 'text-black' : SUIT_COLORS[card.suit]);

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.05, y: -10 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "w-20 h-32 sm:w-24 sm:h-36 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between p-2 select-none transition-all cursor-pointer",
        disabled && "cursor-not-allowed",
        isSelected && "translate-y-[-20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-yellow-400",
        !isPlayable && !disabled && "opacity-70",
        className
      )}
    >
      {/* Top Left */}
      <div className={cn("flex flex-col items-center leading-none", colorClass)}>
        <span className="font-black text-lg sm:text-xl">{rankText}</span>
        <span className="text-lg sm:text-2xl">{symbol}</span>
      </div>

      {/* Center Big Symbol */}
      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl opacity-20", colorClass)}>
        {symbol}
      </div>

      {/* Bottom Right (Rotated) */}
      <div className={cn("flex flex-col items-center leading-none rotate-180", colorClass)}>
        <span className="font-black text-lg sm:text-xl">{rankText}</span>
        <span className="text-lg sm:text-2xl">{symbol}</span>
      </div>
      
    </motion.div>
  );
}
