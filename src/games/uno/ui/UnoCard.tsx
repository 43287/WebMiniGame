import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../components/ui.tsx';
import { Card as UnoCardType } from '../types.ts';

interface UnoCardProps {
  card: UnoCardType;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  black: 'bg-gray-800',
};

export function UnoCard({ card, onClick, disabled, isPlayable, className }: UnoCardProps) {
  if (!card) return null; // Safety check
  const canPlay = !disabled && isPlayable;
  
  // Handle masked/unknown cards
  // Assuming masked cards have type 'wild' (or dummy) and id starts with 'unknown' or similar check
  // But based on logic.ts maskState, we used type 'wild' and value 0, color 'black'.
  // However, the ID is 'unknown-x'.
  // If we want to render a "Card Back", we should check if it's unknown.
  // The current UI logic in Board just renders the card properties.
  // If we want a specific "Back" design, we can check for a specific flag or deduce it.
  // For now, let's render it as is, which will look like a Black Wild Card with value 0.
  // Maybe we can improve this to look like a Card Back if type is 'unknown' (if we added that type)
  // or if ID starts with 'unknown'.
  
  const isUnknown = card.id && card.id.toString().startsWith('unknown');

  if (isUnknown) {
      return (
        <motion.div
            className={cn(
                "w-20 h-32 sm:w-24 sm:h-36 rounded-xl border-2 border-white bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden transition-opacity flex-shrink-0",
                className
            )}
        >
            <div className="text-white font-black text-4xl rotate-45 select-none opacity-50">UNO</div>
        </motion.div>
      );
  }

  return (
    <motion.button
      whileHover={{ rotate: canPlay ? Math.random() * 4 - 2 : 0 }}
      whileTap={canPlay ? { scale: 0.95 } : {}}
      onClick={(e) => {
          if (disabled) {
              e.preventDefault();
              return;
          }
          onClick?.();
      }}
      aria-disabled={disabled}
      className={cn(
        "w-20 h-32 sm:w-24 sm:h-36 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden transition-opacity flex-shrink-0",
        COLOR_MAP[card.color] || 'bg-gray-500',
        disabled ? "opacity-80 cursor-not-allowed grayscale-[0.5]" : "cursor-pointer",
        className
      )}
    >
      <div className="absolute inset-0 bg-white opacity-10 rounded-full scale-150 translate-y-10" />
      <span className="text-white font-black text-3xl drop-shadow-md z-10">
        {card.type === 'number' ? card.value : 
         card.type === 'skip' ? '🚫' :
         card.type === 'reverse' ? '🔁' :
         card.type === 'draw2' ? '+2' :
         card.type === 'wild' ? '🌈' : '+4'}
      </span>
      {/* Mini corner icons */}
      <span className="absolute top-1 left-1 text-white text-xs font-bold opacity-80">
        {card.type === 'number' ? card.value : card.type.toUpperCase().slice(0, 1)}
      </span>
      <span className="absolute bottom-1 right-1 text-white text-xs font-bold opacity-80 rotate-180">
        {card.type === 'number' ? card.value : card.type.toUpperCase().slice(0, 1)}
      </span>
    </motion.button>
  );
}
