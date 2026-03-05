
import { produce } from 'immer';
import { GameRuleDefinition } from './types.ts';
import { GameLogic } from '../../GameInterface.ts';
import { GameState, Player } from '../../../types.ts';
import { PokerData, PokerCard, Suit, Rank } from '../types.ts';
import { createDeck, shuffle, deal } from '../../common/deckUtils.ts';

// Zha Jinhua Rank Values
// 2-9, 10, J=11, Q=12, K=13, A=14
function getZhaJinhuaRankValue(rank: Rank): number {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    if (typeof rank === 'number') return rank;
    return 0;
}

// Hand Types
enum HandType {
    Leopard = 6,      // 3 of a kind
    StraightFlush = 5, // Same suit, consecutive
    Flush = 4,        // Same suit
    Straight = 3,     // Consecutive
    Pair = 2,         // 2 same rank
    HighCard = 1      // Mixed
}

function getHandType(cards: PokerCard[]): { type: HandType, values: number[] } {
    // Sort descending
    const sorted = [...cards].sort((a, b) => getZhaJinhuaRankValue(b.rank) - getZhaJinhuaRankValue(a.rank));
    const v = sorted.map(c => getZhaJinhuaRankValue(c.rank));
    const suits = sorted.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    
    // Check Straight (A, K, Q is largest; A, 2, 3 is smallest in some rules, or handled specially)
    // Standard Zha Jinhua: A-K-Q > ... > 2-3-4.
    // Special: A-2-3 (QKA > ... > A23)? Or A23 is small straight?
    // Let's assume standard consecutive: 14, 13, 12 ... 4, 3, 2.
    // Also A, 2, 3 -> 14, 3, 2. If we treat A as 1 for straight check?
    // Common rule: A-2-3 is valid straight (and usually smallest straight flush / straight, but sometimes second largest).
    // Let's stick to strict consecutive for now to simplify, or handle A-2-3.
    // If A(14), 3, 2 -> it's a straight (A-2-3).
    let isStraight = false;
    if (v[0] === v[1] + 1 && v[1] === v[2] + 1) isStraight = true;
    if (v[0] === 14 && v[1] === 3 && v[2] === 2) isStraight = true; // A-2-3

    // Check Leopard
    if (v[0] === v[1] && v[1] === v[2]) return { type: HandType.Leopard, values: [v[0]] };

    // Check Straight Flush
    if (isFlush && isStraight) return { type: HandType.StraightFlush, values: v };

    // Check Flush
    if (isFlush) return { type: HandType.Flush, values: v };

    // Check Straight
    // Handle A-2-3 (Smallest Straight)
    if (isStraight && v[0] === 14 && v[1] === 3 && v[2] === 2) {
        return { type: HandType.Straight, values: [3, 2, 1] }; 
    }
    if (isStraight) return { type: HandType.Straight, values: v };

    // Check Pair
    if (v[0] === v[1]) return { type: HandType.Pair, values: [v[0], v[2]] }; // Pair High, Kicker
    if (v[1] === v[2]) return { type: HandType.Pair, values: [v[1], v[0]] };
    if (v[0] === v[2]) return { type: HandType.Pair, values: [v[0], v[1]] }; // Should not happen if sorted

    // High Card
    // Check 2-3-5 special rule (different suit)
    // Only applies when comparing against Leopard. We can handle this in comparison logic.
    return { type: HandType.HighCard, values: v };
}

// Compare hands: return >0 if h1 wins, <0 if h2 wins, 0 if tie
function compareZhaJinhuaHands(h1: PokerCard[], h2: PokerCard[]): number {
    const t1 = getHandType(h1);
    const t2 = getHandType(h2);

    // Special Rule: 2-3-5 > Leopard
    const is235 = (h: { type: HandType, values: number[] }) => 
        h.type === HandType.HighCard && h.values[0] === 5 && h.values[1] === 3 && h.values[2] === 2;
    
    if (t1.type === HandType.Leopard && is235(t2)) return -1;
    if (is235(t1) && t2.type === HandType.Leopard) return 1;

    if (t1.type !== t2.type) return t1.type - t2.type;

    // Same type, compare values
    for (let i = 0; i < t1.values.length; i++) {
        if (t1.values[i] !== t2.values[i]) return t1.values[i] - t2.values[i];
    }
    return 0;
}

// Temporary local deck creation for Poker
function createPokerDeck(): PokerCard[] {
    const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
    const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    let deck: PokerCard[] = [];
    let idCounter = 0;

    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({ id: `p-${idCounter++}`, type: 'poker', suit, rank });
        });
    });

    return deck;
}

class ZhaJinhuaLogic implements GameLogic {
    minPlayers = 2;
    maxPlayers = 5; 
    
    constructor(private settings: any) {}

    init(players: Player[], settings?: any): GameState {
        const deck = shuffle(createPokerDeck());
        // Deal 3 cards each
        const { hands, remainingDeck } = deal(deck, 3, players.length);
        
        const handsMap: { [key: string]: PokerCard[] } = {};
        const chipsMap: { [key: string]: number } = {};
        const initialChips = settings?.initialChips || 1000;
        const baseBet = settings?.baseBet || 1;

        players.forEach((p, i) => {
            handsMap[p.id] = hands[i];
            chipsMap[p.id] = initialChips;
        });

        // Initial Ante (Deduct baseBet from everyone)
        let pot = 0;
        players.forEach(p => {
            if (chipsMap[p.id] >= baseBet) {
                chipsMap[p.id] -= baseBet;
                pot += baseBet;
            } else {
                // All in if not enough (edge case)
                pot += chipsMap[p.id];
                chipsMap[p.id] = 0;
            }
        });

        const data: PokerData = {
            deck: remainingDeck,
            discardPile: [],
            hands: handsMap,
            chips: chipsMap,
            pot: pot,
            currentBet: baseBet, // Current bet to call
            currentPlayerIndex: 0,
            direction: 1,
            ruleState: {
                round: 1,
                hasLooked: {},
                hasFolded: {},
                hasLost: {}, // Track players who lost comparison
                activePlayers: players.map(p => p.id),
                turnCount: 0 // Track turns in current round
            },
            settings: { rule: 'zhajinhua', ...settings, baseBet }
        };

        return {
            id: '',
            type: 'poker',
            players,
            status: 'playing',
            currentTurn: players[0].id,
            gameData: data
        };
    }

    makeMove(state: GameState, playerId: string, move: any): GameState {
        if (state.status !== 'playing') return state;
        if (state.currentTurn !== playerId && move.action !== 'look') return state; // Only 'look' can be done out of turn (technically no, usually must be your turn or always allowed? In most apps, always allowed. Let's say always allowed for now, or just stick to turn based for simplicity. Actually 'look' is usually allowed anytime. But let's restrict to turn for now or just allow it.)
        
        // Let's allow 'look' anytime if it's your hand
        if (move.action === 'look') {
            return produce(state, draft => {
                const data = draft.gameData as PokerData;
                data.ruleState.hasLooked[playerId] = true;
                
                // If we implemented 'look' only on turn, we wouldn't advance turn.
                // If we allow anytime, we just update state.
                // Assuming anytime:
            });
        }

        // Other moves must be on turn
        if (state.currentTurn !== playerId) return state;

        return produce(state, draft => {
            const data = draft.gameData as PokerData;
            const playerChips = data.chips![playerId];
            const hasLooked = data.ruleState.hasLooked[playerId];
            const multiplier = hasLooked ? 2 : 1;
            
            // Logic for Next Turn
            const nextTurn = () => {
                let nextIndex = (data.currentPlayerIndex + 1) % state.players.length;
                let loopCount = 0;
                while (
                    (data.ruleState.hasFolded[state.players[nextIndex].id] || 
                    data.ruleState.hasLost?.[state.players[nextIndex].id]) && 
                    loopCount < state.players.length
                ) {
                    nextIndex = (nextIndex + 1) % state.players.length;
                    loopCount++;
                }
                
                // Check Round End (if index loops back to starter? Simplified: just count turns)
                // Better: Track who started the round or just increment turn count
                
                data.currentPlayerIndex = nextIndex;
                draft.currentTurn = state.players[nextIndex].id;
                
                // Check if only 1 player left
                const active = state.players.filter(p => 
                    !data.ruleState.hasFolded[p.id] && 
                    !data.ruleState.hasLost?.[p.id]
                );
                
                if (active.length === 1) {
                    draft.status = 'finished';
                    draft.winner = active[0].id;
                    // Winner takes pot
                    if (data.chips) {
                        data.chips[active[0].id] += data.pot;
                        data.pot = 0;
                    }
                }
            };

            switch (move.action) {
                case 'bet': // Call or Raise
                case 'call': 
                case 'raise': {
                    // Calculate cost
                    // If call: currentBet * multiplier
                    // If raise: move.amount * multiplier (and update currentBet)
                    
                    let baseAmount = data.currentBet;
                    if (move.action === 'raise' && move.amount > data.currentBet) {
                        baseAmount = move.amount;
                        data.currentBet = baseAmount;
                    }
                    
                    const cost = baseAmount * multiplier;
                    
                    if (playerChips >= cost) {
                        data.chips![playerId] -= cost;
                        data.pot += cost;
                        nextTurn();
                    }
                    break;
                }
                
                case 'fold': {
                    data.ruleState.hasFolded[playerId] = true;
                    nextTurn();
                    break;
                }
                
                case 'compare': {
                    // Compare with targetId
                    const targetId = move.targetId;
                    if (!targetId || targetId === playerId) return; // Invalid target
                    
                    // Cost to compare is usually currentBet * multiplier
                    const cost = data.currentBet * multiplier;
                    
                    if (playerChips >= cost) {
                        data.chips![playerId] -= cost;
                        data.pot += cost;
                        
                        // Perform comparison
                        const myHand = data.hands[playerId];
                        const targetHand = data.hands[targetId];
                        
                        const result = compareZhaJinhuaHands(myHand, targetHand);
                        
                        // Loser is eliminated (marked as hasLost)
                        if (result > 0) {
                            // Current player wins, target loses
                            if (!data.ruleState.hasLost) data.ruleState.hasLost = {};
                            data.ruleState.hasLost[targetId] = true;
                        } else {
                            // Target wins (or tie, usually challenger loses on tie or active player loses)
                            // Let's say challenger loses on tie/loss
                            if (!data.ruleState.hasLost) data.ruleState.hasLost = {};
                            data.ruleState.hasLost[playerId] = true;
                        }
                        
                        nextTurn();
                    }
                    break;
                }
            }
        });
    }

    checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
        if (state.status === 'finished') {
            return { winner: state.winner || null, status: 'finished' };
        }
        return { winner: null, status: 'playing' };
    }

    getBotMove(state: GameState, botId: string): any {
        // Simple bot: Call if good hand, Fold if bad, Random Compare
        return { action: 'bet' }; // Always call for now
    }
    
    maskState(state: GameState, playerId: string): GameState {
        return produce(state, draft => {
            const data = draft.gameData as PokerData;
            const hasLooked = data.ruleState.hasLooked[playerId];
            
            // Mask all hands except own (if looked)
            // Actually in Zha Jinhua you can't see your own hand unless you 'look'.
            // But for UI simplicity, if you haven't 'looked', we send masked cards even for self?
            // Or we send real cards but UI hides them?
            // Secure way: Send masked cards until 'look' action is confirmed.
            
            Object.keys(data.hands).forEach(pId => {
                if (pId !== playerId) {
                    // Always mask others
                    data.hands[pId] = data.hands[pId].map(c => ({ ...c, rank: 2, suit: 'none', type: 'poker', id: 'unknown' } as any));
                } else {
                    // Mask own if not looked
                    if (!hasLooked) {
                         data.hands[pId] = data.hands[pId].map(c => ({ ...c, rank: 2, suit: 'none', type: 'poker', id: 'unknown' } as any));
                    }
                }
            });
        });
    }
}

export const ZhaJinhuaRule: GameRuleDefinition = {
    meta: {
        id: 'zhajinhua',
        name: '炸金花 (Zha Jinhua)',
        description: '三张牌比大小，心理博弈',
        minPlayers: 2,
        maxPlayers: 5,
        allowBots: true,
        settingsSchema: {
            baseBet: { type: 'number', label: '底注', default: 10, min: 1, max: 100 },
            maxRounds: { type: 'number', label: '最大轮数', default: 10, min: 5, max: 20 },
            initialChips: { type: 'number', label: '初始筹码', default: 1000, min: 100, max: 10000 }
        }
    },
    createLogic: (settings) => new ZhaJinhuaLogic(settings)
};
