import React, { useState } from 'react';
import { UnoData, Card as UnoCardType, CardColor } from '../types.ts';
import { GameState } from '../../../types.ts';
import { cn, Button } from '../../../components/ui.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MessageBox } from './MessageBox.tsx';
import { UnoCard } from './UnoCard.tsx';

interface UnoBoardProps {
  gameState: GameState;
  currentPlayerId: string;
  onMakeMove: (move: { action: 'play' | 'draw' | 'keep' | 'shoutUno' | 'challenge' | 'declineChallenge' | 'catchUnoFailure'; cardId?: string; chosenColor?: CardColor; targetId?: string }) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  black: 'bg-gray-800',
};

export default function UnoBoard({ gameState, currentPlayerId, onMakeMove }: UnoBoardProps) {
  const data = gameState.gameData as UnoData;
  const myHand = data.hands[currentPlayerId] || [];
  const isMyTurn = gameState.currentTurn === currentPlayerId;
  const topCard = data.discardPile[data.discardPile.length - 1];
  
  const [showColorPicker, setShowColorPicker] = useState<{ cardId: string } | null>(null);

  // Background Glow Color Mapping
  const GLOW_COLOR_MAP: Record<string, string> = {
    red: 'from-red-500/20 via-red-500/5',
    blue: 'from-blue-500/20 via-blue-500/5',
    green: 'from-green-500/20 via-green-500/5',
    yellow: 'from-yellow-400/20 via-yellow-400/5',
    black: 'from-gray-800/20 via-gray-800/5', 
  };

  const getCardSymbol = (card: UnoCardType) => {
    if (card.type === 'number') return card.value;
    if (card.type === 'skip') return '🚫';
    if (card.type === 'reverse') return '🔁';
    if (card.type === 'draw2') return '+2';
    if (card.type === 'wild') return '🌈';
    if (card.type === 'wild_draw4') return '+4';
    return '?';
  };
  
  // Dynamic Hand Spacing Logic
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [overlap, setOverlap] = useState(0);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  React.useEffect(() => {
      if (myHand.length <= 1) {
          setOverlap(0);
          setScale(1);
          return;
      }

      // Card width logic (matching CSS: w-20 = 80px, sm:w-24 = 96px)
      const isSmallScreen = window.innerWidth < 640;
      const cardWidth = isSmallScreen ? 80 : 96;
      const padding = 32; // px-8 = 32px total horizontal padding
      const availableWidth = containerWidth - padding;
      
      const totalWidthNeeded = myHand.length * cardWidth;
      
      let newScale = 1;
      
      if (totalWidthNeeded <= availableWidth) {
          setOverlap(0); // Spread out fully
      } else {
          // Calculate needed overlap
          const visibleWidth = (availableWidth - cardWidth) / (myHand.length - 1);
          let newOverlap = cardWidth - visibleWidth;
          
          // Calculate overlap percentage
          const overlapPercentage = newOverlap / cardWidth;
          
          // If overlap causes 3 cards to effectively stack significantly (implied by high overlap), scale down.
          // Requirement: "Once hand cards overlap significantly (e.g. 3 cards stack), scale down once."
          // Requirement: "Return to normal size when overlap < 35%."
          
          // Let's interpret "3 cards folding together" as high density.
          // If overlap is > 65% (meaning < 35% visible), it's getting crowded.
          // Or we can use the "3 cards" rule: if total width needed is > 2 * availableWidth? 
          // Let's stick to the overlap percentage rule provided:
          // "Scale down once." -> triggered by some condition.
          // "Return to normal when overlap < 35%."
          
          // Let's define the trigger for scaling down:
          // If cards are too squeezed. Let's say if visible part is small.
          // If overlap > 60% (40% visible), scale down to 0.8.
          
          // However, scaling down reduces cardWidth, which changes the overlap calculation!
          // We need to calculate what the overlap WOULD be at scale 1.
          
          if (overlapPercentage > 0.60) {
              newScale = 0.8;
          }
          
          // Hysteresis / Reset condition:
          // If we are already scaled down, we only go back up if overlap (at normal size) would be < 35%.
          // But since we recalculate every render based on window width, we can just check the condition.
          // "After that, when overlap < 35%, return to normal."
          if (overlapPercentage < 0.35) {
              newScale = 1;
          } else if (scale === 0.8 && overlapPercentage >= 0.35) {
              // Keep it scaled down if it was scaled down and hasn't reached the clear threshold?
              // The prompt says: "This operation happens once" (scaling down).
              // "After that, when ... < 35% ... return to normal."
              // This implies a stateful behavior or a simple threshold logic.
              // Let's implement: 
              // If overlap > 60% -> Scale 0.8
              // If overlap < 35% -> Scale 1
              // In between -> Keep current scale (Hysteresis)
              
              if (scale === 1) {
                   // Currently normal. Trigger scale down if very crowded.
                   // Let's assume "3 cards folding" means we can't fit them well.
                   // If we have to overlap more than 50%?
                   if (overlapPercentage > 0.5) {
                       newScale = 0.8;
                   }
              } else {
                   // Currently small. Only go back if plenty of space.
                   newScale = 0.8; // Stick to small
              }
          }
          
          // Recalculate overlap with new scale
          const scaledCardWidth = cardWidth * newScale;
          const scaledTotalWidth = myHand.length * scaledCardWidth;
          
          if (scaledTotalWidth <= availableWidth) {
              newOverlap = 0; 
          } else {
              // Ensure we calculate visible width based on the scaled dimensions
              // Formula: TotalWidth = CardWidth + (N-1) * (CardWidth - Overlap)
              // We want TotalWidth <= AvailableWidth
              // AvailableWidth = CardWidth + (N-1) * (CardWidth - Overlap)
              // (AvailableWidth - CardWidth) / (N-1) = CardWidth - Overlap
              // Overlap = CardWidth - (AvailableWidth - CardWidth) / (N-1)
              
              const scaledVisibleWidth = (availableWidth - scaledCardWidth) / (myHand.length - 1);
              newOverlap = scaledCardWidth - scaledVisibleWidth;
          }
          
          // Cap overlap to ensure at least some part is visible (e.g. 20px scaled)
          // However, if we cap it, we might overflow the container!
          // Prioritize fitting in container over visibility if extremely crowded?
          // Or just clamp the overlap to not exceed cardWidth (which would mean 0 visibility)
          // The previous logic capped overlap which caused overflow if (CardWidth - Overlap) * N > Available
          
          // Let's ensure total width doesn't exceed available width first.
          // The calculated 'newOverlap' above mathematically ensures strict fit.
          // If we apply a maxOverlap (minimum visibility), we might break the fit.
          
          // Let's enforce a minimum visible width of say 10px (scaled).
          // If ensuring 10px visibility causes overflow, we have no choice but to overflow or scroll.
          // But the prompt implies "right cards invisible" is the bug.
          // So we should strictly respect availableWidth.
          
          // Check if the calculated overlap is valid (non-negative)
          if (newOverlap < 0) newOverlap = 0;
          
          // If overlap is too large (close to cardWidth), cards are barely visible.
          // But we must fit them.
          // So we use the calculated newOverlap directly without clamping by 'maxOverlap' that enforces visibility.
          // Instead, we clamp it only by cardWidth (cannot overlap more than 100%).
          if (newOverlap > scaledCardWidth) newOverlap = scaledCardWidth;
          
          setOverlap(Math.max(0, newOverlap));
      }
      
      setScale(newScale);
  }, [containerWidth, myHand.length]);

  const handleCardClick = (card: UnoCardType) => {
    if (!isMyTurn) return;

    // If challenge active, cannot play cards (must respond to challenge)
    if (data.challengeState && data.challengeState.active) return;

    if (card.color === 'black') {
      setShowColorPicker({ cardId: card.id });
      return;
    }

    onMakeMove({ action: 'play', cardId: card.id });
  };

  const handleColorPick = (color: CardColor) => {
    if (showColorPicker) {
      onMakeMove({ action: 'play', cardId: showColorPicker.cardId, chosenColor: color });
      setShowColorPicker(null);
    }
  };

  const isCardPlayable = (card: UnoCardType) => {
    // If challenge active, cannot play
    if (data.challengeState && data.challengeState.active) return false;

    // Stack Draw Logic Check
    if (data.pendingDraw && data.pendingDraw > 0) {
        if (!data.settings.stackDraw) return false;
        
        // Same type stacking
        if (card.type === 'draw2' && topCard.type === 'draw2') return true;
        if (card.type === 'wild_draw4' && topCard.type === 'wild_draw4') return true;
        
        // Cross type stacking
        if (data.settings.stackPlus4OnPlus2 && 
            card.type === 'wild_draw4' && topCard.type === 'draw2') {
            return true;
        }
        
        return false;
    }

    if (card.color === 'black') return true;
    if (card.color === data.currentColor) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type !== 'number' && card.type === topCard.type) return true;
    return false;
  };

  // Calculate opponents
  const opponents = gameState.players.filter(p => p.id !== currentPlayerId);

  // Challenge Mode
  const isChallengeActive = data.challengeState && data.challengeState.active;
  const isSuspect = isChallengeActive && data.challengeState?.suspectId === currentPlayerId;
  const canChallenge = isChallengeActive && data.challengeState?.challengerId === currentPlayerId;

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto p-4 relative select-none">
      
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none bg-radial-[at_50%_50%] from-transparent via-transparent to-transparent">
        {Object.entries(GLOW_COLOR_MAP).map(([color, gradientClass]) => (
            <div
                key={color}
                className={cn(
                    "absolute inset-0 transition-opacity duration-1000 ease-in-out bg-radial-[at_50%_50%] to-transparent",
                    gradientClass,
                    data.currentColor === color ? "opacity-100" : "opacity-0"
                )}
            />
        ))}
      </div>

      {/* Game Info / Direction */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
          <div className="bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm">
             方向: {data.direction === 1 ? '顺时针 ↻' : '逆时针 ↺'}
          </div>
          <div className={cn("bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm flex items-center gap-2")}>
             当前牌面: <span className="font-black text-lg">{getCardSymbol(topCard)}</span>
          </div>
      </div>

      {/* Opponents Area */}
      <div className="flex justify-center gap-4 mb-4 flex-wrap min-h-[120px]">
        {opponents.map((opponent) => {
            const isCurrent = gameState.currentTurn === opponent.id;
            const cardCount = data.hands[opponent.id]?.length || 0;
            const hasShouted = data.unoShouted[opponent.id];
            
            return (
                <div key={opponent.id} className="relative group">
                    <div className={cn(
                        "flex flex-col items-center p-2 rounded-lg border-2 border-black bg-white transition-all w-24",
                        isCurrent ? "scale-110 shadow-[4px_4px_0px_0px_rgba(255,200,0,1)] bg-yellow-50 z-10" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    )}>
                        <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-black mb-1 flex items-center justify-center font-bold overflow-hidden">
                            {opponent.name[0]}
                        </div>
                        <span className="font-bold text-sm truncate w-full text-center">{opponent.name}</span>
                        <div className="mt-2 font-black text-xl flex items-center gap-1">
                            <span className="text-2xl">🎴</span> {cardCount}
                        </div>
                        {hasShouted && (
                            <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-black animate-bounce">
                                UNO!
                            </div>
                        )}
                    </div>
                    
                    {/* Catch Button (Visible on Hover if condition met) */}
                    {cardCount === 1 && !hasShouted && (
                        <button 
                            onClick={() => onMakeMove({ action: 'catchUnoFailure', targetId: opponent.id })}
                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded border-2 border-black shadow-md hover:scale-110 transition-transform whitespace-nowrap z-20"
                        >
                            揭发!
                        </button>
                    )}
                </div>
            );
        })}
      </div>

      {/* Center Area: Deck & Discard */}
      <div className="flex-1 flex items-center justify-center gap-12 mb-8 relative">
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-4">
            <div 
                className={cn(
                    "w-24 h-36 bg-black rounded-xl border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform",
                    isMyTurn && !isChallengeActive && !data.hasDrawnThisTurn ? "cursor-pointer hover:scale-105 active:scale-95" : "opacity-80 cursor-not-allowed"
                )}
                onClick={() => isMyTurn && !isChallengeActive && !data.hasDrawnThisTurn && onMakeMove({ action: 'draw' })}
            >
                <span className="text-white font-black text-4xl rotate-45 select-none">UNO</span>
            </div>
            {isMyTurn && data.hasDrawnThisTurn && !data.settings.drawUntilMatch && (
                <Button 
                    onClick={() => onMakeMove({ action: 'keep' })}
                    variant="secondary"
                    className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold animate-bounce"
                >
                    跳过
                </Button>
            )}
            {isMyTurn && data.settings.drawUntilMatch && !data.hasDrawnThisTurn && (
                <div className="absolute top-full mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded border border-yellow-500 whitespace-nowrap animate-pulse">
                    必须摸到可出牌!
                </div>
            )}
            {isMyTurn && data.settings.drawUntilMatch && data.hasDrawnThisTurn && (
                 <div className="absolute top-full mt-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-500 whitespace-nowrap animate-bounce">
                    请出牌!
                </div>
            )}
        </div>

        {/* Discard Pile */}
        <div className="relative">
            <UnoCard card={topCard} disabled />
            {/* Current Color Indicator if Wild */}
            <div className={cn(
                "absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-black shadow-sm z-20",
                COLOR_MAP[data.currentColor]
            )} title="Current Color" />
            
            {isChallengeActive && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-black/50 rounded-xl flex items-center justify-center z-30">
                     <span className="text-white font-bold text-lg drop-shadow-md">质疑中...</span>
                </div>
            )}
        </div>
      </div>

      {/* Waiting Indicator for Other Players */}
      {isChallengeActive && !canChallenge && !isSuspect && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-full font-bold animate-pulse z-40">
              等待下家决定是否质疑...
          </div>
      )}

      {/* Challenge UI Overlay */}
      {isChallengeActive && canChallenge && (
        <MessageBox 
            isOpen={true}
            title="有人打出了 +4!"
            message="你怀疑他们手里有其他牌可以出吗？"
            buttons={[
                { label: "质疑 (Challenge)", onClick: () => onMakeMove({ action: 'challenge' }), variant: 'danger' },
                { label: "接受 (+4)", onClick: () => onMakeMove({ action: 'declineChallenge' }), variant: 'secondary' }
            ]}
            footer={
                <p>
                    质疑成功：对方摸4张。<br/>
                    质疑失败：你摸6张 (4+2)。<br/>
                    如果不质疑，你摸4张。
                </p>
            }
        />
      )}

      {/* Player Hand */}
      <div className="relative min-h-[180px] flex flex-col justify-end items-center">
        
        {/* Action Bar */}
        <div className="flex items-center gap-4 mb-4">
             {/* UNO Shout Button */}
             <Button 
                onClick={() => onMakeMove({ action: 'shoutUno' })}
                className={cn(
                    "bg-red-600 hover:bg-red-700 text-white font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all",
                    data.unoShouted[currentPlayerId] ? "opacity-50 cursor-not-allowed" : ""
                )}
                disabled={data.unoShouted[currentPlayerId]}
             >
                 喊 UNO!
             </Button>
        </div>

        <div className="flex justify-center w-full overflow-x-hidden pt-12 pb-4 px-4 min-h-[180px]" ref={containerRef}>
            <div 
                className="flex py-2 px-4 transition-all duration-300 ease-out"
                style={{ 
                    gap: overlap === 0 ? '0.5rem' : '0',
                    justifyContent: overlap === 0 ? 'center' : 'flex-start',
                    width: overlap > 0 ? 'max-content' : 'auto',
                    minWidth: '100%' // Ensure centering works when spreading
                }}
            >
                <AnimatePresence mode='popLayout'>
                {myHand.map((card, index) => (
                    <motion.div
                        layout
                        key={card.id}
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ 
                            scale: scale, 
                            opacity: 1, 
                            y: 0,
                            marginLeft: index === 0 ? 0 : -overlap,
                            zIndex: index
                        }}
                        whileHover={{ 
                            scale: 1.1, // Always hover to slightly larger than normal
                            y: -30, 
                            zIndex: 100, // Lift above other cards
                            transition: { duration: 0.1 } // Snappy lift
                        }}
                        exit={{ scale: 0.8, opacity: 0, y: -50, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative"
                        style={{ zIndex: index }} // Default stacking order
                    >
                        <UnoCard 
                            card={card} 
                            onClick={() => handleCardClick(card)}
                            isPlayable={isCardPlayable(card)}
                            disabled={!isMyTurn || isChallengeActive}
                            className={cn(
                                isMyTurn && !isCardPlayable(card) ? "opacity-50" : "opacity-100",
                                "transition-opacity duration-300"
                            )}
                        />
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </div>
        
        {isMyTurn && !isChallengeActive && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-yellow-300 border-2 border-black px-6 py-2 rounded-full font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse z-20 pointer-events-none">
                你的回合!
            </div>
        )}
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-xl backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-black mb-4 text-center">选择颜色!</h3>
                <div className="grid grid-cols-2 gap-4">
                    {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map((color) => (
                        <button
                            key={color}
                            onClick={() => handleColorPick(color)}
                            className={cn(
                                "w-20 h-20 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform",
                                COLOR_MAP[color]
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
