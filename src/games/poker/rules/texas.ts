
import { produce } from 'immer';
import { GameRuleDefinition } from './types.ts';
import { GameLogic } from '../../GameInterface.ts';
import { GameState, Player } from '../../../types.ts';
import { PokerData, PokerCard, Suit, Rank } from '../types.ts';
import { shuffle } from '../../common/deckUtils.ts';

// --- Card & Deck Utilities ---

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

function createPokerDeck(): PokerCard[] {
    const deck: PokerCard[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                id: `${suit}-${rank}`,
                suit,
                rank,
                isFaceUp: false,
                isSelected: false
            });
        }
    }
    return shuffle(deck);
}

function getRankValue(rank: Rank): number {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    if (typeof rank === 'number') return rank;
    return 0;
}

// --- Hand Evaluation Logic ---

enum HandType {
    HighCard = 1,
    Pair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush,
    RoyalFlush
}

interface HandEvaluation {
    type: HandType;
    values: number[]; // Main values to compare (e.g., pair rank, kickers)
}

function evaluateHand(cards: PokerCard[]): HandEvaluation {
    if (cards.length === 0) return { type: HandType.HighCard, values: [] };

    // Sort by rank descending
    const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    const ranks = sorted.map(c => getRankValue(c.rank));
    const suits = sorted.map(c => c.suit);

    // Check Flush
    const suitCounts: Record<string, number> = {};
    let flushSuit: string | null = null;
    for (const s of suits) {
        suitCounts[s] = (suitCounts[s] || 0) + 1;
        if (suitCounts[s] >= 5) flushSuit = s;
    }

    const flushCards = flushSuit ? sorted.filter(c => c.suit === flushSuit) : [];
    const isFlush = flushCards.length >= 5;

    // Check Straight
    // Unique ranks for straight check
    const uniqueRanks = Array.from(new Set(ranks));
    let straightHigh: number | null = null;
    
    // Check for 5 consecutive ranks
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        const window = uniqueRanks.slice(i, i + 5);
        if (window[0] - window[4] === 4) {
            straightHigh = window[0];
            break;
        }
    }
    // Check A-2-3-4-5 (A=14, so 14, 5, 4, 3, 2)
    if (!straightHigh && uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        straightHigh = 5;
    }

    // Check Straight Flush
    if (isFlush) {
        const flushRanks = flushCards.map(c => getRankValue(c.rank));
        const uniqueFlushRanks = Array.from(new Set(flushRanks));
        let sfHigh: number | null = null;
        for (let i = 0; i <= uniqueFlushRanks.length - 5; i++) {
            const window = uniqueFlushRanks.slice(i, i + 5);
            if (window[0] - window[4] === 4) {
                sfHigh = window[0];
                break;
            }
        }
        // A-2-3-4-5 Flush
        if (!sfHigh && uniqueFlushRanks.includes(14) && uniqueFlushRanks.includes(2) && uniqueFlushRanks.includes(3) && uniqueFlushRanks.includes(4) && uniqueFlushRanks.includes(5)) {
            sfHigh = 5;
        }

        if (sfHigh) {
            if (sfHigh === 14) return { type: HandType.RoyalFlush, values: [] };
            return { type: HandType.StraightFlush, values: [sfHigh] };
        }
    }

    // Check Four of a Kind, Full House, Three of a Kind, Two Pair, Pair
    const rankCounts: Record<number, number> = {};
    for (const r of ranks) {
        rankCounts[r] = (rankCounts[r] || 0) + 1;
    }

    const fours: number[] = [];
    const threes: number[] = [];
    const pairs: number[] = [];

    for (const r in rankCounts) {
        const count = rankCounts[r];
        const val = parseInt(r);
        if (count === 4) fours.push(val);
        if (count === 3) threes.push(val);
        if (count === 2) pairs.push(val);
    }
    
    fours.sort((a, b) => b - a);
    threes.sort((a, b) => b - a);
    pairs.sort((a, b) => b - a);

    if (fours.length > 0) {
        const kicker = ranks.find(r => r !== fours[0]) || 0;
        return { type: HandType.FourOfAKind, values: [fours[0], kicker] };
    }

    if (threes.length > 0 && (threes.length >= 2 || pairs.length > 0)) {
        // Full House
        const tri = threes[0];
        const pair = threes.length >= 2 ? threes[1] : pairs[0];
        return { type: HandType.FullHouse, values: [tri, pair] };
    }

    if (isFlush) {
        return { type: HandType.Flush, values: flushCards.slice(0, 5).map(c => getRankValue(c.rank)) };
    }

    if (straightHigh) {
        return { type: HandType.Straight, values: [straightHigh] };
    }

    if (threes.length > 0) {
        const kickers = ranks.filter(r => r !== threes[0]).slice(0, 2);
        return { type: HandType.ThreeOfAKind, values: [threes[0], ...kickers] };
    }

    if (pairs.length >= 2) {
        const p1 = pairs[0];
        const p2 = pairs[1];
        const kicker = ranks.find(r => r !== p1 && r !== p2) || 0;
        return { type: HandType.TwoPair, values: [p1, p2, kicker] };
    }

    if (pairs.length === 1) {
        const p = pairs[0];
        const kickers = ranks.filter(r => r !== p).slice(0, 3);
        return { type: HandType.Pair, values: [p, ...kickers] };
    }

    return { type: HandType.HighCard, values: ranks.slice(0, 5) };
}

function compareHands(h1: HandEvaluation, h2: HandEvaluation): number {
    if (h1.type !== h2.type) return h1.type - h2.type;
    for (let i = 0; i < h1.values.length; i++) {
        if (h1.values[i] !== h2.values[i]) return h1.values[i] - h2.values[i];
    }
    return 0;
}


// --- Game Logic ---

export class TexasHoldemLogic implements GameLogic {
    minPlayers = 2;
    maxPlayers = 10;

    constructor(private settings: any) {}

    private calculatePots(players: Player[], texasState: any): { amount: number, eligiblePlayers: string[] }[] {
        const pots: { amount: number, eligiblePlayers: string[] }[] = [];
        const bets = players.map(p => ({ 
            id: p.id, 
            amount: texasState.playerBets[p.id] || 0 
        })).filter(b => b.amount > 0).sort((a, b) => a.amount - b.amount);

        let lastAmount = 0;
        
        for (let i = 0; i < bets.length; i++) {
            const currentAmount = bets[i].amount;
            const diff = currentAmount - lastAmount;
            
            if (diff > 0) {
                // Determine how many players contributed at least this amount
                // Since bets are sorted, it's everyone from i onwards
                const contributorsCount = bets.length - i;
                const potAmount = diff * contributorsCount;
                
                // Eligible players are those who haven't folded and contributed at least this amount
                // AND are not all-in with less than this amount (though sorted logic handles that implicitly)
                // Actually, if someone is all-in with `currentAmount`, they are eligible for THIS pot but not next.
                // If someone folded, they are NOT eligible.
                
                const eligible = bets.slice(i)
                    .map(b => b.id)
                    .filter(id => !texasState.foldedPlayers.includes(id));

                if (eligible.length > 0) {
                    pots.push({ amount: potAmount, eligiblePlayers: eligible });
                } else {
                    // If everyone folded (shouldn't happen in normal flow, but just in case),
                    // Money stays in pot or goes to last man standing (handled elsewhere)
                }
                lastAmount = currentAmount;
            }
        }
        
        return pots;
    }

    init(players: Player[], settings?: any): GameState {
        const deck = createPokerDeck();
        const hands: { [playerId: string]: PokerCard[] } = {};
        
        // Deal 2 cards to each player
        players.forEach(p => {
            hands[p.id] = [deck.pop()!, deck.pop()!];
        });

        // Determine dealer (button), small blind, big blind
        // For simplicity, random dealer first, or index 0
        const dealerIndex = 0;
        const sbIndex = (dealerIndex + 1) % players.length;
        const bbIndex = (dealerIndex + 2) % players.length;
        
        const smallBlindAmount = settings?.smallBlind || 1;
        const bigBlindAmount = settings?.bigBlind || 2;

        const chips: { [playerId: string]: number } = {};
        const bids: { [playerId: string]: number | 'pass' } = {}; // 'pass' usually means fold in code, but here we track bets
        const bets: { [playerId: string]: number } = {}; // Current round bets

        players.forEach(p => {
            chips[p.id] = settings?.initialChips || 1000;
            bets[p.id] = 0;
            bids[p.id] = 0; // tracking total bet in round?
        });

        // Post blinds
        // TODO: Handle if player doesn't have enough chips (All-in)
        chips[players[sbIndex].id] -= smallBlindAmount;
        bets[players[sbIndex].id] = smallBlindAmount;
        
        chips[players[bbIndex].id] -= bigBlindAmount;
        bets[players[bbIndex].id] = bigBlindAmount;

        const currentBet = bigBlindAmount;
        // Action starts after BB
        const nextPlayerIndex = (bbIndex + 1) % players.length;

        const pokerData: PokerData = {
            deck,
            discardPile: [],
            hands,
            pot: 0, // Blinds go to pot at end of round or immediately? Usually kept in betting area until round end.
                    // Simplified: Add to pot immediately for display, or keep separate 'currentRoundPot'.
            currentBet,
            chips,
            bottomCards: [], // Community cards
            currentPlayerIndex: nextPlayerIndex,
            direction: 1,
            ruleState: {
                phase: 'bidding', // Reuse 'bidding' as 'betting'
                currentBid: currentBet,
                lastBidder: players[bbIndex].id, // Technically BB is the last 'aggressor' initially
                passCount: 0,
                lastPlay: null,
                lastPlayPlayerId: null,
                playedCards: {},
                bids: {}, // We might use this for status like 'fold'
                hasFolded: {} // Compatible with UI
            },
            settings: {
                rule: 'texas',
                ...settings
            }
        };

        // Custom field for Texas state
        (pokerData as any).texasState = {
            stage: 'pre-flop', // pre-flop, flop, turn, river, showdown
            communityCards: [],
            dealerIndex,
            sbIndex,
            bbIndex,
            roundBets: { ...bets }, // Track bets in current street
            playerBets: { ...bets }, // Track total bets in hand
            mainPot: smallBlindAmount + bigBlindAmount,
            foldedPlayers: [],
            allInPlayers: [],
            displayPots: [], // UI Display
            currentRound: 1,
            maxRounds: settings?.maxRounds || 0
        };

        // Initial pot calculation
        (pokerData as any).texasState.displayPots = this.calculatePots(players, (pokerData as any).texasState);

        return {
            gameType: 'poker',
            players,
            currentTurn: players[nextPlayerIndex].id,
            gameData: pokerData,
            status: 'playing',
            winner: null
        };
    }

    makeMove(state: GameState, playerId: string, move: any): GameState {
        return produce(state, draft => {
            const data = draft.gameData as PokerData;
            const texas = (data as any).texasState;
            const playerIndex = draft.players.findIndex(p => p.id === playerId);
            
            if (move.action === 'nextHand') {
                if (texas.stage !== 'hand_over') return;
                // Only host or auto can trigger? Let's allow any player for now to keep it simple, or check if all ready.
                // Usually host triggers.
                
                // Increment Round
                texas.currentRound++;
                
                // Rotate Dealer
                // Find next valid dealer (someone with chips)
                let nextDealerIndex = (texas.dealerIndex + 1) % draft.players.length;
                while (data.chips![draft.players[nextDealerIndex].id] <= 0) {
                    nextDealerIndex = (nextDealerIndex + 1) % draft.players.length;
                    if (nextDealerIndex === texas.dealerIndex) {
                        // Should be game over if only 1 player, but handled elsewhere
                        break;
                    }
                }
                texas.dealerIndex = nextDealerIndex;
                texas.sbIndex = (nextDealerIndex + 1) % draft.players.length; // Will be adjusted if player has no chips?
                // Logic for SB/BB needs to skip eliminated players too
                
                const getNextActive = (start: number) => {
                    let idx = start;
                    let count = 0;
                    while (data.chips![draft.players[idx].id] <= 0 && count < draft.players.length) {
                        idx = (idx + 1) % draft.players.length;
                        count++;
                    }
                    return idx;
                };

                texas.sbIndex = getNextActive((texas.dealerIndex + 1) % draft.players.length);
                texas.bbIndex = getNextActive((texas.sbIndex + 1) % draft.players.length);

                // Reset Hand State
                const deck = createPokerDeck();
                data.deck = deck;
                data.discardPile = [];
                
                // Deal cards to active players only
                draft.players.forEach(p => {
                    if (data.chips![p.id] > 0) {
                        data.hands[p.id] = [deck.pop()!, deck.pop()!];
                    } else {
                        data.hands[p.id] = [];
                    }
                });

                // Reset Pots/Bets
                texas.stage = 'pre-flop';
                texas.communityCards = [];
                data.bottomCards = [];
                texas.roundBets = {};
                texas.playerBets = {}; // Reset for new hand
                texas.foldedPlayers = [];
                texas.allInPlayers = [];
                texas.displayPots = [];
                data.ruleState.hasFolded = {};
                data.ruleState.lastBidder = null;
                data.currentBet = 0; // Will be set by BB

                // Post Blinds
                const smallBlindAmount = data.settings?.smallBlind || 1;
                const bigBlindAmount = data.settings?.bigBlind || 2;
                
                // SB Post
                const sbId = draft.players[texas.sbIndex].id;
                let sbBet = smallBlindAmount;
                if (data.chips![sbId] < sbBet) {
                    sbBet = data.chips![sbId];
                    texas.allInPlayers.push(sbId);
                }
                data.chips![sbId] -= sbBet;
                texas.roundBets[sbId] = sbBet;
                texas.playerBets[sbId] = sbBet;

                // BB Post
                const bbId = draft.players[texas.bbIndex].id;
                let bbBet = bigBlindAmount;
                if (data.chips![bbId] < bbBet) {
                    bbBet = data.chips![bbId];
                    texas.allInPlayers.push(bbId);
                }
                data.chips![bbId] -= bbBet;
                texas.roundBets[bbId] = bbBet;
                texas.playerBets[bbId] = bbBet;

                data.currentBet = bbBet;
                texas.mainPot = sbBet + bbBet;
                texas.displayPots = this.calculatePots(draft.players, texas);

                // Set Turn (Next active after BB)
                const nextTurnIndex = getNextActive((texas.bbIndex + 1) % draft.players.length);
                draft.currentTurn = draft.players[nextTurnIndex].id;
                data.currentPlayerIndex = nextTurnIndex;
                
                // Hide Winner Info from previous hand
                draft.winner = null; 
                // Don't reset status to playing yet? Or keep it playing.
                // If it was finished, we need to set back to playing?
                // Actually status usually tracks the whole game. 
                // If we are in 'hand_over', status is still 'playing' probably.
                
                return;
            }

            if (draft.currentTurn !== playerId) return;
            if (texas.foldedPlayers.includes(playerId)) return;
            if (texas.stage === 'hand_over') return;

            const currentBet = texas.roundBets[playerId] || 0;
            const callAmount = data.currentBet - currentBet;
            let addedToPot = 0;

            // Handle Moves
            if (move.action === 'fold') {
                texas.foldedPlayers.push(playerId);
                data.ruleState.hasFolded[playerId] = true;
                
                // Check if only one player left (Win by Fold)
                const activePlayers = draft.players.filter(p => !texas.foldedPlayers.includes(p.id));
                if (activePlayers.length === 1) {
                    const winnerId = activePlayers[0].id;
                    
                    // Winner takes all
                    // Calculate total pot from displayPots or mainPot
                    // Use mainPot for simplicity as it tracks total money in pot
                    data.chips![winnerId] += texas.mainPot;
                    
                    draft.winner = winnerId;
                    
                    // Check Game End Conditions
                    const playersWithChips = draft.players.filter(p => data.chips![p.id] > 0);
                    
                    if (playersWithChips.length <= 1) {
                        draft.status = 'finished';
                        draft.winner = playersWithChips[0]?.id || draft.winner;
                    } else if (texas.maxRounds > 0 && texas.currentRound >= texas.maxRounds) {
                        draft.status = 'finished';
                        const chipLeader = [...draft.players].sort((a, b) => data.chips![b.id] - data.chips![a.id])[0];
                        draft.winner = chipLeader.id;
                    } else {
                        texas.stage = 'hand_over';
                        // status remains 'playing'
                    }
                    return;
                }
            } else if (move.action === 'call') {
                if (data.chips![playerId] >= callAmount) {
                    data.chips![playerId] -= callAmount;
                    addedToPot = callAmount;
                    texas.roundBets[playerId] = (texas.roundBets[playerId] || 0) + callAmount;
                } else {
                    // All-in (partial call)
                    const allInAmt = data.chips![playerId];
                    data.chips![playerId] = 0;
                    addedToPot = allInAmt;
                    texas.roundBets[playerId] = (texas.roundBets[playerId] || 0) + allInAmt;
                    texas.allInPlayers.push(playerId);
                }
            } else if (move.action === 'check') {
                if (callAmount > 0) {
                    // Invalid check, treat as fold? Or reject?
                    // For now, reject or auto-fold
                    // Let's assume UI prevents this, or treat as fold
                    // Actually, if it's invalid, we should throw or return
                    return; 
                }
                // Do nothing, just pass
            } else if (move.action === 'raise') {
                const raiseAmount = move.amount || (data.currentBet * 2); // Simple min-raise
                const totalToBet = raiseAmount - currentBet;
                 if (data.chips![playerId] >= totalToBet) {
                    data.chips![playerId] -= totalToBet;
                    addedToPot = totalToBet;
                    texas.roundBets[playerId] = raiseAmount; // Update total bet for this round
                    data.currentBet = raiseAmount;
                    data.ruleState.lastBidder = playerId; // Track who raised
                }
            } else if (move.action === 'all-in') {
                 const allInAmt = data.chips![playerId];
                 data.chips![playerId] = 0;
                 const totalBet = currentBet + allInAmt;
                 addedToPot = allInAmt;
                 texas.roundBets[playerId] = totalBet;
                 if (totalBet > data.currentBet) {
                     data.currentBet = totalBet;
                     data.ruleState.lastBidder = playerId;
                 }
                 texas.allInPlayers.push(playerId);
            }

            if (addedToPot > 0) {
                texas.mainPot += addedToPot;
                texas.playerBets[playerId] = (texas.playerBets[playerId] || 0) + addedToPot;
                // Recalculate pots for UI
                texas.displayPots = this.calculatePots(draft.players, texas);
            }

            // Move turn
            // Need to find next active player
            let nextIndex = (playerIndex + 1) % draft.players.length;
            let loopCount = 0;
            
            // Check if round is complete
            // Round ends when:
            // 1. All active players have acted (we need to track who acted this round)
            // 2. All active players matched the current bet (or are all-in)
            
            // Simplified Turn Logic:
            // Pass turn to next non-folded player
            while (texas.foldedPlayers.includes(draft.players[nextIndex].id) || texas.allInPlayers.includes(draft.players[nextIndex].id)) {
                nextIndex = (nextIndex + 1) % draft.players.length;
                loopCount++;
                if (loopCount > draft.players.length) break; // Should not happen unless game over
            }

            // Check if betting round is over
            // Logic: If everyone active has bet equal to currentBet (or is all-in), and everyone has had a chance to act.
            // This is complex. Simplified:
            // We need to track 'hasActed' for each player in the current street.
            
            // Let's assume we just move to next player. 
            // If the next player has already bet == currentBet and they were not the last raiser, then the round might be over.
            
            // Alternative: Just count calls/checks.
            // If we are back to the last aggressor (or Big Blind if no raises), and everyone called/folded.
            
            // Let's simplify:
            // If next player's current bet == data.currentBet AND (nextPlayer == lastBidder OR everyone checked), then next street.
            
            // Logic for 'everyone checked': lastBidder is null or reset?
            // In pre-flop, lastBidder is initially BB (effectively).
            
            const nextPlayerId = draft.players[nextIndex].id;
            const isRoundComplete = (texas.roundBets[nextPlayerId] === data.currentBet) && 
                                    (data.ruleState.lastBidder === null || // Everyone checked
                                     data.ruleState.lastBidder === nextPlayerId || // Back to raiser
                                     (texas.stage === 'pre-flop' && nextPlayerId === draft.players[texas.bbIndex].id && data.currentBet === (settings?.bigBlind || 2) && move.action !== 'raise') // BB option check
                                    );

             // Wait, the BB check condition is tricky.
             // If everyone calls BB, action comes back to BB. BB can check. If BB checks, round over.
             
            if (isRoundComplete) {
                this.nextStage(draft);
            } else {
                draft.currentTurn = nextPlayerId;
                data.currentPlayerIndex = nextIndex;
            }
        });
    }

    private nextStage(draft: GameState) {
        const data = draft.gameData as PokerData;
        const texas = (data as any).texasState;
        
        // Reset bets for next round
        texas.roundBets = {}; 
        data.currentBet = 0;
        data.ruleState.lastBidder = null; // Reset aggressor

        if (texas.stage === 'pre-flop') {
            texas.stage = 'flop';
            // Deal 3 cards
            texas.communityCards.push(data.deck.pop()!, data.deck.pop()!, data.deck.pop()!);
            data.bottomCards = texas.communityCards;
        } else if (texas.stage === 'flop') {
            texas.stage = 'turn';
            texas.communityCards.push(data.deck.pop()!);
            data.bottomCards = texas.communityCards;
        } else if (texas.stage === 'turn') {
            texas.stage = 'river';
            texas.communityCards.push(data.deck.pop()!);
            data.bottomCards = texas.communityCards;
        } else if (texas.stage === 'river') {
            texas.stage = 'showdown';
            this.handleShowdown(draft);
            return;
        }

        // Set turn to SB (or first active player after Dealer)
        let nextIndex = (texas.dealerIndex + 1) % draft.players.length;
        while (texas.foldedPlayers.includes(draft.players[nextIndex].id) || texas.allInPlayers.includes(draft.players[nextIndex].id)) {
            nextIndex = (nextIndex + 1) % draft.players.length;
        }
        draft.currentTurn = draft.players[nextIndex].id;
        data.currentPlayerIndex = nextIndex;
    }

    private handleShowdown(draft: GameState) {
        const data = draft.gameData as PokerData;
        const texas = (data as any).texasState;
        
        // Evaluate all active hands
        const activePlayers = draft.players.filter(p => !texas.foldedPlayers.includes(p.id));
        const evaluations = activePlayers.map(p => {
            const hand = [...data.hands[p.id], ...texas.communityCards];
            return { playerId: p.id, eval: evaluateHand(hand) };
        });

        evaluations.sort((a, b) => compareHands(b.eval, a.eval)); // Descending winner first

        // Distribute Pots (Main + Side)
        // Simplified: Just assign winner for display.
        // Real implementation should update chips based on pots.
        
        const pots = texas.displayPots;
        
        pots.forEach((pot: any) => {
             // Find best hand among eligible players
             const eligibleEvals = evaluations.filter(e => pot.eligiblePlayers.includes(e.playerId));
             if (eligibleEvals.length === 0) return; // Should not happen
             
             // Sort again just for this subset (already sorted generally but safe to be sure)
             // Actually evaluations is sorted globally. The best eligible is the first one in `evaluations` that is in `eligiblePlayers`.
             
             // We need to handle ties.
             // Find max score first
             let bestEval = eligibleEvals[0];
             const winners = eligibleEvals.filter(e => compareHands(e.eval, bestEval.eval) === 0);
             
             const winAmount = Math.floor(pot.amount / winners.length);
             winners.forEach(w => {
                 data.chips![w.playerId] += winAmount;
             });
        });

        // Set Winner for Display (Main Pot Winner usually)
        const mainPotWinners = evaluations.filter(e => compareHands(e.eval, evaluations[0].eval) === 0);
        if (mainPotWinners.length === 1) {
            draft.winner = mainPotWinners[0].playerId;
        } else {
            draft.winner = mainPotWinners.map(w => w.playerId).join(',');
        }
        
        // Reveal all hands
        activePlayers.forEach(p => {
             data.hands[p.id].forEach(c => c.isFaceUp = true);
        });

        // Check Game End
        // Condition 1: Max Rounds reached
        // Condition 2: Only one player has chips (others eliminated)
        
        const playersWithChips = draft.players.filter(p => data.chips![p.id] > 0);
        
        if (playersWithChips.length <= 1) {
             draft.status = 'finished';
             draft.winner = playersWithChips[0]?.id || draft.winner; // Last man standing or hand winner
        } else if (texas.maxRounds > 0 && texas.currentRound >= texas.maxRounds) {
             draft.status = 'finished';
             // Winner is player with most chips
             const chipLeader = [...draft.players].sort((a, b) => data.chips![b.id] - data.chips![a.id])[0];
             draft.winner = chipLeader.id;
        } else {
             // Continue to next hand
             texas.stage = 'hand_over';
             // draft.status remains 'playing'
        }
    }

    checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
        const data = state.gameData as PokerData;
        const texas = (data as any).texasState;
        
        // Check if only one player left (Folded)
        // This check usually happens during betting round.
        // If everyone folds but one, they win the pot immediately.
        
        // If status is finished, return it
        if (state.status === 'finished') {
            return { winner: state.winner, status: 'finished' };
        }
        
        // Special case: Everyone folded in betting round
        const activePlayers = state.players.filter(p => !texas.foldedPlayers.includes(p.id));
        if (activePlayers.length === 1) {
             // Award pots to last player
             // We need to move chips to them?
             // Yes, simplify: give all main pot to them. Side pots might be tricky if they weren't eligible?
             // If everyone folds, the last player takes everything they were eligible for?
             // Usually they just take the whole pot collected so far.
             const winnerId = activePlayers[0].id;
             data.chips![winnerId] += texas.mainPot; // Simplified
             
             // Check Game End logic same as showdown
             const playersWithChips = state.players.filter(p => data.chips![p.id] > 0);
             if (playersWithChips.length <= 1) {
                 return { winner: winnerId, status: 'finished' };
             }
             
             if (texas.maxRounds > 0 && texas.currentRound >= texas.maxRounds) {
                 const chipLeader = [...state.players].sort((a, b) => data.chips![b.id] - data.chips![a.id])[0];
                 return { winner: chipLeader.id, status: 'finished' };
             }
             
             // Mark for next hand
             // We can't modify state here (checkWin is read-only usually, but in this framework it returns status)
             // We need to trigger a state change. 
             // Ideally makeMove should handle 'win by fold'.
             // Let's assume makeMove calls nextStage -> handleShowdown -> handles this.
             // But wait, makeMove doesn't call handleShowdown if folded.
             
             return { winner: winnerId, status: 'playing' }; // UI shows winner, waits for Next Hand
        }

        return { winner: null, status: 'playing' };
    }

    getBotMove(state: GameState, botId: string): any {
        // Very dumb bot: always call/check
        const data = state.gameData as PokerData;
        const texas = (data as any).texasState;
        const currentBet = texas.roundBets[botId] || 0;
        const callAmount = data.currentBet - currentBet;
        
        if (callAmount > 0) return { action: 'call' };
        return { action: 'check' };
    }

    maskState(state: GameState, playerId: string): GameState {
        // Hide other players' hole cards
        // Hide deck?
        return produce(state, draft => {
             const data = draft.gameData as PokerData;
             const texas = (data as any).texasState;

             Object.keys(data.hands).forEach(pid => {
                 if (pid !== playerId && texas.stage !== 'showdown' && state.status !== 'finished') {
                     // Hide cards
                     data.hands[pid] = data.hands[pid].map(c => ({ ...c, rank: 0 as any, suit: 'none' as any, id: 'back' }));
                 }
             });
             
             // Hide deck
             data.deck = []; 
        });
    }
}

export const TexasHoldemRule: GameRuleDefinition = {
    meta: {
        id: 'texas',
        name: 'Texas Hold\'em',
        minPlayers: 2,
        maxPlayers: 10,
        allowBots: true,
        settingsSchema: {
            smallBlind: { type: 'number', label: 'Small Blind', default: 1, min: 1 },
            bigBlind: { type: 'number', label: 'Big Blind', default: 2, min: 2 },
            initialChips: { type: 'number', label: 'Initial Chips', default: 1000, min: 100 },
            maxRounds: { type: 'number', label: 'Rounds (0=Unlimited)', default: 0, min: 0 }
        }
    },
    createLogic: (settings: any) => new TexasHoldemLogic(settings)
};
