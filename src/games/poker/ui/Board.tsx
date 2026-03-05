
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GameState } from '../../../types.ts';
import { PokerData, PokerCard as PokerCardType } from '../types.ts';
import { TableLayout } from '../../common/ui/TableLayout.tsx';
import { PlayerAvatar } from '../../common/ui/PlayerAvatar.tsx';
import { PokerCard } from './PokerCard.tsx';
import { Button, cn } from '../../../components/ui.tsx';
import { getDouDizhuRankValue } from '../rules/utils.ts';

interface PokerBoardProps {
    gameState: GameState;
    currentPlayerId: string;
    onMakeMove: (move: any) => void;
}

export default function PokerBoard({ gameState, currentPlayerId, onMakeMove }: PokerBoardProps) {
    const data = gameState.gameData as PokerData;
    const rule = data.settings.rule;
    const myHand = data.hands[currentPlayerId] || [];
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isComparing, setIsComparing] = useState(false);

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);
        updateWidth();

        return () => resizeObserver.disconnect();
    }, []);

    // Reset comparing state on turn change
    useEffect(() => {
        if (gameState.currentTurn !== currentPlayerId) {
            setIsComparing(false);
        }
    }, [gameState.currentTurn, currentPlayerId]);
    
    // Selection State
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

    const handleCardClick = (cardId: string) => {
        if (selectedCardIds.includes(cardId)) {
            setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
        } else {
            setSelectedCardIds([...selectedCardIds, cardId]);
        }
    };

    // Group cards for Dou Dizhu Stacking
    const groupedHand = useMemo(() => {
        if (rule !== 'doudizhu') {
            return myHand.map(c => ({ ...c, _group: [c] }));
        }

        const groups: (PokerCardType & { _group: PokerCardType[] })[] = [];
        let currentGroup: PokerCardType[] = [];
        
        myHand.forEach((card, index) => {
            if (index === 0) {
                currentGroup.push(card);
            } else {
                const prevCard = myHand[index - 1];
                if (getDouDizhuRankValue(card.rank) === getDouDizhuRankValue(prevCard.rank)) {
                    currentGroup.push(card);
                } else {
                    groups.push({ ...currentGroup[0], _group: [...currentGroup] });
                    currentGroup = [card];
                }
            }
        });
        if (currentGroup.length > 0) {
            groups.push({ ...currentGroup[0], _group: [...currentGroup] });
        }
        
        return groups;
    }, [myHand, rule]);

    // Dynamic Scale and Overlap Calculation
    const { scale, marginRight } = useMemo(() => {
        if (!containerWidth || groupedHand.length === 0) return { scale: 1, marginRight: 0 };

        const cardWidth = 96; 
        const numGroups = groupedHand.length;
        const gap = 4; 
        const visibleSlice = cardWidth + gap;
        const requiredWidth = numGroups * visibleSlice - gap;
        let targetScale = 1.0;
        
        if (requiredWidth <= containerWidth) {
            targetScale = 1.0;
        } else {
            targetScale = containerWidth / requiredWidth;
            targetScale = Math.max(0.4, targetScale);
        }
        return { scale: targetScale, marginRight: gap };

    }, [containerWidth, groupedHand.length]);

    // Rule Specific Render Logic - Header (Dou Dizhu)
    const renderDouDizhuHeader = () => {
        if (rule !== 'doudizhu') return null;
        
        return (
            <div className="flex flex-col items-center gap-2 z-10">
                {data.bottomCards && data.bottomCards.length > 0 ? (
                    <div className="flex gap-2 p-2 bg-black/20 rounded-xl backdrop-blur-sm border border-white/10">
                        {data.bottomCards.map(c => (
                            <PokerCard key={c.id} card={c} disabled className="scale-75 origin-center shadow-md" />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2 p-2 bg-black/20 rounded-xl backdrop-blur-sm border border-white/10">
                        {[1,2,3].map(i => (
                            <PokerCard key={i} card={{ id: `back-${i}`, type: 'poker', suit: 'none', rank: 2 }} faceDown className="scale-75 origin-center shadow-md" />
                        ))}
                    </div>
                )}
                {data.multiplier && (
                    <div className="text-white bg-yellow-600/90 px-4 py-1 rounded-full text-sm font-bold shadow-lg border border-yellow-400">
                        倍数: {data.multiplier} | 底分: {data.ruleState.currentBid || 0}
                    </div>
                )}
            </div>
        );
    };

    const renderTexasTable = () => {
         const texasState = (data as any).texasState;
         return (
             <div className="flex flex-col items-center gap-4 pointer-events-auto">
                 {/* Community Cards */}
                 <div className="flex gap-2 mb-4 bg-green-800/50 p-4 rounded-xl border-4 border-yellow-600 shadow-inner min-h-[140px] min-w-[300px] items-center justify-center">
                     {data.bottomCards && data.bottomCards.length > 0 ? (
                         data.bottomCards.map((c, i) => (
                             <PokerCard key={c.id || i} card={c} disabled className="scale-100 origin-center shadow-md" />
                         ))
                     ) : (
                         <div className="text-white font-bold opacity-50">等待翻牌...</div>
                     )}
                 </div>

                 {/* Pot Info */}
                 <div className="flex flex-col items-center gap-2">
                    {texasState?.displayPots && texasState.displayPots.length > 0 ? (
                        texasState.displayPots.map((pot: any, index: number) => (
                            <div key={index} className={`bg-black/80 text-white px-6 py-2 rounded-full font-bold text-xl border-2 ${index === 0 ? 'border-yellow-500' : 'border-blue-400 scale-90'} shadow-lg flex items-center gap-4`}>
                                <span>{index === 0 ? 'Main Pot' : `Side Pot ${index}`}: {pot.amount} 💰</span>
                                {index > 0 && (
                                    <span className="text-xs opacity-70">({pot.eligiblePlayers.length}人)</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="bg-black/80 text-white px-6 py-2 rounded-full font-bold text-xl border-2 border-yellow-500 shadow-lg flex items-center gap-4">
                            <span>Pot: {texasState?.mainPot || 0} 💰</span>
                        </div>
                    )}
                    <span className="text-white text-sm font-bold bg-black/40 px-2 py-1 rounded">Stage: {texasState?.stage?.toUpperCase()}</span>
                 </div>
             </div>
         );
    };

    const renderTexasActions = () => {
         const isMyTurn = gameState.currentTurn === currentPlayerId;
         const texasState = (data as any).texasState;
         const myBet = texasState?.roundBets?.[currentPlayerId] || 0;
         const callAmount = data.currentBet - myBet;
         const [raiseAmount, setRaiseAmount] = useState<number>(0);
         
         // Calculate Raise Range
         // Min raise: usually 2x big blind or double the previous bet/raise.
         // Simplified: max(data.currentBet * 2, bigBlind * 2)
         // But data.currentBet includes the previous bet. 
         // Standard rule: raise must be at least the size of the previous bet/raise.
         // If currentBet is 10 (BB=2, Raise=8), min re-raise is 10 + 8 = 18.
         // Simplified for this implementation: Min Raise = Current Bet * 2 (or BB if 0)
         
         const bigBlind = data.settings?.bigBlind || 2;
         const minRaise = Math.max((data.currentBet || bigBlind) * 2, bigBlind * 2);
         const myChips = data.chips?.[currentPlayerId] || 0;
         const maxRaise = myChips; // Can go all-in
         
         // Initialize raise amount when turn starts
         useEffect(() => {
             if (isMyTurn) {
                 setRaiseAmount(Math.min(minRaise, maxRaise));
             }
         }, [isMyTurn, minRaise, maxRaise]);

         // Hand Over: Show Next Hand Button
         if (texasState?.stage === 'hand_over') {
             return (
                 <div className="flex flex-col items-center gap-4 pointer-events-auto">
                     <div className="text-2xl font-black text-white bg-black/50 px-6 py-2 rounded-xl animate-bounce">
                         🏆 本局结束! 赢家: {gameState.winner ? gameState.players.find(p => p.id === gameState.winner)?.name : 'N/A'}
                     </div>
                     <Button 
                        onClick={() => onMakeMove({ action: 'nextHand' })}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black text-xl px-8 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                     >
                         下一局 ➡️
                     </Button>
                 </div>
             );
         }

         if (!isMyTurn) return null;

         return (
             <div className="flex gap-4 items-end mt-4 pointer-events-auto">
                 <Button 
                    variant="danger"
                    onClick={() => onMakeMove({ action: 'fold' })}
                    className="h-12"
                 >
                     弃牌
                 </Button>
                 
                 {callAmount <= 0 ? (
                     <Button 
                        className="h-14 bg-blue-500 hover:bg-blue-600 min-w-[100px]"
                        onClick={() => onMakeMove({ action: 'check' })}
                     >
                         过牌
                     </Button>
                 ) : (
                     <Button 
                        className="h-14 bg-green-500 hover:bg-green-600 min-w-[100px]"
                        onClick={() => onMakeMove({ action: 'call' })}
                     >
                         <div className="flex flex-col items-center leading-none">
                             <span>跟注</span>
                             <span className="text-xs text-yellow-200 font-bold">{callAmount}</span>
                         </div>
                     </Button>
                 )}

                 <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-xl border-2 border-black/10 min-w-[200px] h-[100px] justify-center">
                     <div className="flex items-center gap-2 w-full">
                         <span className="text-white text-xs font-bold whitespace-nowrap w-16">加注: {raiseAmount}</span>
                         <input 
                             type="range" 
                             min={minRaise} 
                             max={maxRaise} 
                             step={1} 
                             value={raiseAmount} 
                             onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                             className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                             disabled={maxRaise < minRaise}
                         />
                     </div>
                     <div className="flex gap-2">
                        <Button 
                            className="h-10 text-sm bg-orange-400 hover:bg-orange-500 flex-1"
                            disabled={maxRaise < minRaise}
                            onClick={() => onMakeMove({ action: 'raise', amount: raiseAmount })}
                        >
                            确定
                        </Button>
                        <Button 
                             className="h-10 text-sm bg-red-600 hover:bg-red-700 text-white"
                             onClick={() => onMakeMove({ action: 'all-in' })}
                        >
                            ALL IN
                        </Button>
                     </div>
                 </div>
             </div>
         );
    };

    const renderCenter = () => {
        // Dou Dizhu Game Over
        if (rule === 'doudizhu' && gameState.status === 'finished') {
             return (
                 <div className="flex flex-col items-center gap-4 pointer-events-auto z-50 animate-in zoom-in-50 duration-300">
                     <div className="text-4xl font-black text-white bg-red-600 px-12 py-6 rounded-2xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] flex flex-col items-center">
                         <div className="text-yellow-300 text-6xl mb-2 drop-shadow-md">
                             {gameState.winner === '地主' ? '👑 地主胜利!' : '👨‍🌾 农民胜利!'}
                         </div>
                         <div className="text-lg opacity-80 font-bold">
                             {gameState.winner === '地主' ? '地主统治了比赛!' : '农民推翻了地主!'}
                         </div>
                     </div>
                     <Button 
                        onClick={() => onMakeMove({ action: 'nextHand' })}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black text-2xl px-12 py-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black"
                     >
                         再来一局 ➡️
                     </Button>
                 </div>
             );
        }

        if (rule === 'texas') {
             return null;
        }

        if (rule === 'zhajinhua') {
            const isMyTurn = gameState.currentTurn === currentPlayerId;
            const hasLooked = data.ruleState.hasLooked[currentPlayerId];
            const multiplier = hasLooked ? 2 : 1;
            const callCost = data.currentBet * multiplier;

            if (isComparing) {
                return (
                    <div className="flex flex-col items-center gap-4 animate-bounce">
                        <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            ⚡ 选择一个对手比牌 ⚡
                        </div>
                        <Button variant="secondary" onClick={() => setIsComparing(false)}>
                            取消
                        </Button>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-black/50 text-white px-6 py-3 rounded-full font-bold text-xl border-2 border-yellow-500 shadow-lg backdrop-blur-sm">
                        Pot: {data.pot} 💰 | Base: {data.settings?.baseBet || 1}
                    </div>
                    
                    {/* Action Area */}
                    <div className="flex flex-col gap-2 items-center">
                        {/* Secondary Actions */}
                        <div className="flex gap-2">
                             {!hasLooked && (
                                <Button 
                                    className="px-4 py-1 text-sm bg-blue-400 hover:bg-blue-500" 
                                    onClick={() => onMakeMove({ action: 'look' })}
                                >
                                    👀 看牌
                                </Button>
                            )}
                            {isMyTurn && (
                                <Button 
                                    className="px-4 py-1 text-sm bg-purple-400 hover:bg-purple-500" 
                                    onClick={() => setIsComparing(true)}
                                    // Disable compare if round < 2 (optional rule) or only 2 players left (auto compare?)
                                    // For now enable always if > 1 opponent
                                >
                                    ⚔️ 比牌
                                </Button>
                            )}
                        </div>

                        {/* Main Actions */}
                        <div className="flex gap-4 items-end">
                            <Button 
                                disabled={!isMyTurn}
                                onClick={() => onMakeMove({ action: 'bet', amount: data.currentBet })}
                                className="h-16 text-lg min-w-[120px]"
                            >
                                <div className="flex flex-col items-center leading-none gap-1">
                                    <span>跟注</span>
                                    <span className="text-xs opacity-80">({callCost})</span>
                                </div>
                            </Button>
                            
                            {isMyTurn && (
                                <div className="flex flex-col gap-1">
                                    <Button 
                                        className="h-10 text-sm bg-orange-400 hover:bg-orange-500"
                                        onClick={() => onMakeMove({ action: 'raise', amount: data.currentBet * 2 })}
                                    >
                                        加注 x2
                                    </Button>
                                    <Button 
                                        className="h-10 text-sm bg-orange-400 hover:bg-orange-500"
                                        onClick={() => onMakeMove({ action: 'raise', amount: data.currentBet * 4 })}
                                    >
                                        加注 x4
                                    </Button>
                                </div>
                            )}

                            <Button 
                                variant="danger" 
                                disabled={!isMyTurn}
                                onClick={() => onMakeMove({ action: 'fold' })}
                                className="h-14"
                            >
                                弃牌
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (rule === 'doudizhu') {
             const isMyTurn = gameState.currentTurn === currentPlayerId;
             const phase = data.ruleState.phase;
             
             // Identify Players
             const myIndex = gameState.players.findIndex(p => p.id === currentPlayerId);
             const rightPlayerIdx = (myIndex + 1) % 3;
             const leftPlayerIdx = (myIndex + 2) % 3;
             const rightPlayerId = gameState.players[rightPlayerIdx].id;
             const leftPlayerId = gameState.players[leftPlayerIdx].id;

             const myPlayedCards = data.ruleState.playedCards?.[currentPlayerId];
             const rightPlayedCards = data.ruleState.playedCards?.[rightPlayerId];
             const leftPlayedCards = data.ruleState.playedCards?.[leftPlayerId];

             const renderPlayedCards = (cards: any, label: string) => {
                 if (!cards) return null;
                 if (cards === 'pass') {
                     return <div className="bg-black/60 text-white px-4 py-1 rounded-full text-sm font-bold backdrop-blur-sm border border-white/10 shadow-lg">不出</div>;
                 }
                 return (
                     <div className="flex -space-x-8 scale-90 origin-center hover:scale-100 transition-transform duration-200">
                         {cards.map((c: PokerCardType) => (
                             <PokerCard key={c.id} card={c} disabled className="shadow-xl" />
                         ))}
                     </div>
                 );
             };

             return (
                 <div className="relative w-full min-h-[300px] flex flex-col items-center justify-between pointer-events-none py-4">
                     {/* Middle Area: Played Cards from Left/Right */}
                     <div className="w-full flex justify-between items-center px-4 absolute top-1/2 -translate-y-1/2">
                         {/* Left Player (Previous) */}
                         <div className="flex flex-col items-start transform -translate-x-4">
                             {renderPlayedCards(leftPlayedCards, 'Left')}
                         </div>

                         {/* Right Player (Next) */}
                         <div className="flex flex-col items-end transform translate-x-4">
                             {renderPlayedCards(rightPlayedCards, 'Right')}
                         </div>
                     </div>
                     
                     {/* Bottom Area: My Played Cards */}
                     <div className="flex flex-col items-center mb-4 min-h-[100px] justify-end mt-auto">
                         {renderPlayedCards(myPlayedCards, 'Me')}
                     </div>
                     
                     {/* Action Buttons (Pointer Events Enabled) */}
                     <div className="flex gap-4 pointer-events-auto mt-4">
                         {phase === 'bidding' && isMyTurn && (
                             <>
                                 <Button onClick={() => onMakeMove({ action: 'bid', score: 1 })} className="bg-blue-500 hover:bg-blue-600">1分</Button>
                                 <Button onClick={() => onMakeMove({ action: 'bid', score: 2 })} className="bg-blue-600 hover:bg-blue-700">2分</Button>
                                 <Button onClick={() => onMakeMove({ action: 'bid', score: 3 })} className="bg-blue-700 hover:bg-blue-800">3分</Button>
                                 <Button variant="secondary" onClick={() => onMakeMove({ action: 'bid', score: 0 })}>不叫</Button>
                             </>
                         )}
                         
                         {phase === 'playing' && isMyTurn && (
                             <>
                                 <Button 
                                    disabled={selectedCardIds.length === 0}
                                    onClick={() => {
                                        onMakeMove({ action: 'play', cardIds: selectedCardIds });
                                        setSelectedCardIds([]);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                                 >
                                     出牌
                                 </Button>
                                 <Button 
                                    variant="secondary" 
                                    onClick={() => {
                                        onMakeMove({ action: 'pass' });
                                        setSelectedCardIds([]);
                                    }}
                                    className="bg-gray-600 hover:bg-gray-700 text-lg px-8 py-6"
                                 >
                                     不出
                                 </Button>
                             </>
                         )}
                     </div>
                 </div>
             );
        }
        
        return null;
    };

    const renderPlayer = (player: any) => {
        const isCurrent = gameState.currentTurn === player.id;
        const handCount = data.hands[player.id]?.length || 0;
        const isLandlord = data.landlordId === player.id;
        
        // Zha Jinhua States
        const hasFolded = data.ruleState.hasFolded?.[player.id];
        const hasLost = data.ruleState.hasLost?.[player.id];
        const hasLooked = data.ruleState.hasLooked?.[player.id];
        const chips = data.chips?.[player.id];

        // Texas States
        const texasState = (data as any).texasState;
        const isDealer = texasState && gameState.players[texasState.dealerIndex]?.id === player.id;
        const isSB = texasState && gameState.players[texasState.sbIndex]?.id === player.id;
        const isBB = texasState && gameState.players[texasState.bbIndex]?.id === player.id;

        // Target Selection for Compare
        const isTargetable = isComparing && !hasFolded && !hasLost && player.id !== currentPlayerId;

        // Played Cards Display for others (Dou Dizhu)
        const playedCards = data.ruleState?.playedCards?.[player.id];
        const isLastPlay = data.ruleState?.lastPlayPlayerId === player.id;
        
        return (
            <div key={player.id} className="relative flex flex-col items-center">
                <div 
                    onClick={() => {
                        if (isTargetable) {
                            onMakeMove({ action: 'compare', targetId: player.id });
                            setIsComparing(false);
                        }
                    }}
                    className={cn(
                        "relative transition-all duration-300 rounded-xl",
                        isTargetable ? "cursor-pointer ring-4 ring-red-500 scale-110 animate-pulse bg-red-100/50" : "",
                        hasFolded || hasLost ? "opacity-50 grayscale" : ""
                    )}
                >
                    <PlayerAvatar 
                        player={player}
                        isCurrentTurn={isCurrent}
                        cardCount={handCount}
                        statusText={
                            hasFolded ? '🏳️ 弃牌' : 
                            hasLost ? '☠️ 淘汰' :
                            isLandlord ? '👑 地主' : 
                            hasLooked ? '👀 已看' : undefined
                        }
                        statusColor={hasFolded || hasLost ? 'red' : hasLooked ? 'blue' : 'yellow'}
                    >
                         {/* Chip Display */}
                        {chips !== undefined && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-300 border-2 border-black px-2 py-0.5 rounded-md text-xs font-black whitespace-nowrap shadow-sm z-20 flex items-center gap-1">
                                <span>💰</span> {chips}
                            </div>
                        )}
                        
                        {/* Texas Indicators */}
                        {isDealer && (
                             <div className="absolute -top-3 -right-3 bg-white border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm z-30 transform hover:scale-110 transition-transform cursor-help" title="Dealer">
                                 D
                             </div>
                        )}
                        {isSB && !isDealer && (
                             <div className="absolute -top-3 -left-3 bg-blue-200 border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm z-30 transform hover:scale-110 transition-transform cursor-help" title="Small Blind">
                                 SB
                             </div>
                        )}
                        {isBB && !isDealer && (
                             <div className="absolute -top-3 -left-3 bg-purple-200 border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm z-30 transform hover:scale-110 transition-transform cursor-help" title="Big Blind">
                                 BB
                             </div>
                        )}

                        {/* Target Indicator */}
                         {isTargetable && (
                             <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                 <span className="text-4xl font-black text-red-600 drop-shadow-md">⚔️</span>
                             </div>
                         )}
                    </PlayerAvatar>
                </div>
                
                {/* End Game Hand Reveal */}
                {gameState.status === 'finished' && data.hands[player.id] && (
                    <div className="absolute top-full mt-2 z-20 flex flex-col items-center bg-black/40 p-2 rounded-xl backdrop-blur-sm border border-white/20">
                         <div className="text-white text-xs font-bold mb-1">手牌</div>
                         <div className="flex -space-x-4 scale-50 origin-top h-16">
                             {data.hands[player.id].map((c: PokerCardType) => (
                                 <PokerCard key={c.id} card={c} disabled />
                             ))}
                         </div>
                    </div>
                )}
            </div>
        );
    };

    const myChips = data.chips?.[currentPlayerId];
    const turnDirection = rule === 'texas' ? 'clockwise' : 'counter-clockwise';
    const amILandlord = data.landlordId === currentPlayerId;

    // Identify Players
    const myIndex = gameState.players.findIndex(p => p.id === currentPlayerId);
    const rightPlayerIdx = (myIndex + 1) % 3;
    const leftPlayerIdx = (myIndex + 2) % 3;
    const rightPlayer = gameState.players[rightPlayerIdx];
    const leftPlayer = gameState.players[leftPlayerIdx];

    // Dou Dizhu Mode
    if (rule === 'doudizhu') {
        return (
            <TableLayout
                mode="side-by-side"
                players={[renderPlayer(leftPlayer), renderPlayer(rightPlayer)]}
                children={renderCenter()}
                header={renderDouDizhuHeader()}
                direction={turnDirection}
                myHand={
                    <div className="w-full flex flex-col items-center">
                         {/* My Info Bar */}
                         <div className="mb-2 flex gap-4">
                            {myChips !== undefined && (
                                <div className="bg-yellow-300 border-2 border-black px-4 py-1 rounded-full font-black shadow-sm flex items-center gap-2">
                                    <span>💰 我的筹码:</span>
                                    <span className="text-xl">{myChips}</span>
                                </div>
                            )}
                         </div>

                        <div className="mb-4 z-10">
                            {null}
                        </div>

                        <div ref={containerRef} className="flex justify-center w-full overflow-x-hidden py-4 px-2 min-h-[180px] items-end relative">
                            <div className="flex items-end transition-all duration-300 origin-bottom" style={{ transform: `scale(${scale})` }}>
                                {groupedHand.map((item, groupIndex) => {
                                    const group = item._group;
                                    return (
                                        <div key={group[0].id} className="relative flex flex-col items-center transition-all duration-300" style={{ marginRight: groupIndex === groupedHand.length - 1 ? 0 : `${marginRight}px` }}>
                                            {/* Render Stack from bottom to top visually, but DOM order top to bottom */}
                                            <div className="relative w-20 sm:w-24 h-32 sm:h-36">
                                                {group.map((card, idx) => {
                                                    const isSelected = selectedCardIds.includes(card.id);
                                                    return (
                                                        <div 
                                                            key={card.id} 
                                                            className={cn(
                                                                "absolute left-0 cursor-pointer transition-transform duration-100", 
                                                                isSelected ? "-translate-y-6" : ""
                                                            )}
                                                            style={{ 
                                                                top: `${idx * 30}px`, // Vertical Stacking Offset
                                                                zIndex: idx
                                                            }}
                                                            onClick={() => handleCardClick(card.id)}
                                                        >
                                                            <PokerCard 
                                                                card={card} 
                                                                isSelected={isSelected}
                                                                isPlayable={gameState.currentTurn === currentPlayerId}
                                                                className="hover:!transform-none shadow-md origin-bottom"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Spacer to push width */}
                                            <div style={{ width: '100%', height: `${(group.length - 1) * 30}px` }}></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                }
            />
        );
    }

    return (
        <TableLayout
            players={gameState.players.filter(p => p.id !== currentPlayerId).map(renderPlayer)}
            children={rule === 'texas' ? renderTexasTable() : renderCenter()}
            header={renderDouDizhuHeader()}
            direction={turnDirection}
            myHand={
                <div className="w-full flex flex-col items-center">
                     {/* My Info Bar */}
                     <div className="mb-2 flex gap-4">
                        {myChips !== undefined && (
                            <div className="bg-yellow-300 border-2 border-black px-4 py-1 rounded-full font-black shadow-sm flex items-center gap-2">
                                <span>💰 我的筹码:</span>
                                <span className="text-xl">{myChips}</span>
                            </div>
                        )}
                     </div>

                    <div className="mb-4 z-10">
                        {rule === 'texas' ? renderTexasActions() : null}
                    </div>

                    <div ref={containerRef} className="flex justify-center w-full overflow-x-hidden py-4 px-2 min-h-[180px] items-end relative">
                        <div className="flex items-end transition-all duration-300 origin-bottom" style={{ transform: `scale(${scale})` }}>
                            {groupedHand.map((item, groupIndex) => {
                                const group = item._group;
                                return (
                                    <div key={group[0].id} className="relative flex flex-col items-center transition-all duration-300" style={{ marginRight: groupIndex === groupedHand.length - 1 ? 0 : `${marginRight}px` }}>
                                        {/* Render Stack from bottom to top visually, but DOM order top to bottom */}
                                        <div className="relative w-20 sm:w-24 h-32 sm:h-36">
                                            {group.map((card, idx) => {
                                                const isSelected = selectedCardIds.includes(card.id);
                                                return (
                                                    <div 
                                                        key={card.id} 
                                                        className={cn(
                                                            "absolute left-0 cursor-pointer transition-transform duration-100", 
                                                            isSelected ? "-translate-y-6" : ""
                                                        )}
                                                        style={{ 
                                                            top: `${idx * 30}px`, // Vertical Stacking Offset
                                                            zIndex: idx
                                                        }}
                                                        onClick={() => handleCardClick(card.id)}
                                                    >
                                                        <PokerCard 
                                                            card={card} 
                                                            isSelected={isSelected}
                                                            isPlayable={gameState.currentTurn === currentPlayerId}
                                                            className="hover:!transform-none shadow-md origin-bottom"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Spacer to push width */}
                                        <div style={{ width: '100%', height: `${(group.length - 1) * 30}px` }}></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            }
        />
    );
}
