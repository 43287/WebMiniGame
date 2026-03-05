
import { produce } from 'immer';
import { GameRuleDefinition } from './types.ts';
import { GameLogic } from '../../GameInterface.ts';
import { GameState, Player } from '../../../types.ts';
import { PokerData, PokerCard, Suit, Rank } from '../types.ts';
import { shuffle, deal } from '../../common/deckUtils.ts';
import { sortDouDizhuHand, getDouDizhuRankValue } from './utils.ts';
import { getNextPlayerIndex } from '../../common/turnUtils.ts';

function createDouDizhuDeck(): PokerCard[] {
    const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
    const ranks: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A', 2];
    let deck: PokerCard[] = [];
    let idCounter = 0;

    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({ id: `p-${idCounter++}`, type: 'poker', suit, rank });
        });
    });

    // Jokers
    deck.push({ id: `p-${idCounter++}`, type: 'poker', suit: 'none', rank: 'Joker_Black' });
    deck.push({ id: `p-${idCounter++}`, type: 'poker', suit: 'none', rank: 'Joker_Red' });

    return deck;
}

// Check if cards form a valid DouDizhu hand type
function isValidPlay(cards: PokerCard[]): boolean {
    if (cards.length === 0) return false;
    
    const sorted = sortDouDizhuHand(cards); // Sort for easier checking (Big to Small)
    const len = cards.length;
    
    // Helper to get counts of each rank
    const getCounts = () => {
        const counts: { [rank: number]: number } = {};
        sorted.forEach(c => {
            const v = getDouDizhuRankValue(c.rank);
            counts[v] = (counts[v] || 0) + 1;
        });
        return counts;
    };

    // 1. Single
    if (len === 1) return true;
    
    // 2. Pair
    if (len === 2) {
        // Rocket
        if (sorted[0].rank === 'Joker_Red' && sorted[1].rank === 'Joker_Black') return true;
        // Normal Pair
        return getDouDizhuRankValue(sorted[0].rank) === getDouDizhuRankValue(sorted[1].rank);
    }
    
    // 3. Triplet (3 same)
    if (len === 3) {
        const v = getDouDizhuRankValue(sorted[0].rank);
        return sorted.every(c => getDouDizhuRankValue(c.rank) === v);
    }
    
    // 4. Bomb (4 same)
    if (len === 4) {
        const v = getDouDizhuRankValue(sorted[0].rank);
        if (sorted.every(c => getDouDizhuRankValue(c.rank) === v)) return true;
    }
    
    // 5. Triplet + 1 (3 same + 1 diff) -> 4 cards
    if (len === 4) {
        const counts = getCounts();
        // Should be {x: 3, y: 1}
        return Object.values(counts).includes(3);
    }
    
    // 6. Triplet + Pair (3 same + 2 same) -> 5 cards
    if (len === 5) {
        const counts = getCounts();
        // Should be {x: 3, y: 2}
        const values = Object.values(counts);
        if (values.includes(3) && values.includes(2)) return true;
    }
    
    // 7. Straight (5+ cards, consecutive, max < 15)
    if (len >= 5) {
        // Check for 2 or Joker
        if (sorted.some(c => getDouDizhuRankValue(c.rank) >= 15)) {
             // 2 and Jokers cannot be in straight
        } else {
             // Check consecutive
             // Sorted is Big -> Small (e.g. 7, 6, 5, 4, 3)
             let isStraight = true;
             for (let i = 0; i < len - 1; i++) {
                 const v1 = getDouDizhuRankValue(sorted[i].rank);
                 const v2 = getDouDizhuRankValue(sorted[i+1].rank);
                 if (v1 !== v2 + 1) {
                     isStraight = false;
                     break;
                 }
             }
             if (isStraight) return true;
        }
    }
    
    // 8. Straight Pairs (Liandui) (6+ cards, even length, consecutive pairs)
    if (len >= 6 && len % 2 === 0) {
        // Check for 2 or Joker
        if (sorted.some(c => getDouDizhuRankValue(c.rank) >= 15)) {
            // No 2 or Jokers
        } else {
            // Check pairs and consecutive
            // Sorted: 443322 (Big->Small)
            // Check pairs: i, i+1 same.
            // Check consecutive: i, i+2 diff by 1.
            let isLiandui = true;
            for (let i = 0; i < len; i += 2) {
                // Check pair
                if (getDouDizhuRankValue(sorted[i].rank) !== getDouDizhuRankValue(sorted[i+1].rank)) {
                    isLiandui = false; break;
                }
                // Check consecutive with next pair
                if (i + 2 < len) {
                    const v1 = getDouDizhuRankValue(sorted[i].rank);
                    const v2 = getDouDizhuRankValue(sorted[i+2].rank);
                    if (v1 !== v2 + 1) {
                        isLiandui = false; break;
                    }
                }
            }
            if (isLiandui) return true;
        }
    }
    
    // 9. Four with Two (4+2) - Single or Pair?
    // Standard rule usually 4+2 singles (6 cards) or 4+2 pairs (8 cards).
    // Let's implement 4+2 singles (6 cards)
    if (len === 6) {
        const counts = getCounts();
        // Should be {x: 4, y: 1, z: 1} or {x: 4, y: 2} (if two singles are same rank)
        if (Object.values(counts).includes(4)) return true;
    }
    
    // 4+2 pairs (8 cards)
    if (len === 8) {
        const counts = getCounts();
        // Should be {x: 4, y: 2, z: 2} or {x: 4, y: 4} (two bombs?)
        // If 4+2 pairs, we need 4 of one rank, and 2 pairs.
        // If just checking counts contains 4, we might accept 4+1+1+1+1 (which is not valid 4+2 pairs)
        // But 8 cards 4+2 pairs means 4 of X, 2 of Y, 2 of Z.
        // Counts: {X: 4, Y: 2, Z: 2}
        const values = Object.values(counts);
        if (values.includes(4)) {
            // Check the rest are pairs
            // Count occurrences of 2
            // 4, 2, 2 -> Valid
            // 4, 4 -> Valid (Two bombs used as 4+2 pairs? Usually yes)
            // 4, 1, 1, 1, 1 -> Invalid
            const pairCount = values.filter(v => v === 2 || v === 4).length; 
            // If v=4, it counts as 1 "4". If we have two 4s, it's 2.
            // Wait, if we have 4, 2, 2. Length is 3. 
            // If we have 4, 4. Length is 2.
            // Basically, sum of (v >= 2 ? v : 0) == 8 ?
            // No, strictly 4 + pair + pair.
            // If we have {4, 1, 1, 1, 1} -> No.
            // Logic: Remove the 4. Remainder should be pairs.
            // Since sorted, let's look at counts.
            
            // Remove one 4.
            const idx = values.indexOf(4);
            if (idx !== -1) {
                const remainder = [...values];
                remainder.splice(idx, 1);
                // Check if remainder are all even numbers? (2, 2 or 4)
                if (remainder.every(v => v % 2 === 0)) return true;
            }
        }
    }

    return false;
}

// Get the "primary" value of a hand for comparison
function getHandValue(cards: PokerCard[]): number {
    const sorted = sortDouDizhuHand(cards);
    const counts = new Map<number, number>();
    sorted.forEach(c => {
        const v = getDouDizhuRankValue(c.rank);
        counts.set(v, (counts.get(v) || 0) + 1);
    });
    
    // Find the rank with the highest count (the "main" part)
    let mainRank = 0;
    let maxCount = 0;
    
    counts.forEach((count, rank) => {
        if (count > maxCount) {
            maxCount = count;
            mainRank = rank;
        } else if (count === maxCount) {
            // If counts equal (e.g. Straight), use the largest rank
            if (rank > mainRank) mainRank = rank;
        }
    });
    
    return mainRank;
}

// Compare two plays
function isGreater(newPlay: PokerCard[], lastPlay: PokerCard[]): boolean {
    const newSorted = sortDouDizhuHand(newPlay);
    const lastSorted = sortDouDizhuHand(lastPlay);
    
    // Rocket beats everything
    const isRocket = (cards: PokerCard[]) => cards.length === 2 && cards.some(c => c.rank === 'Joker_Red') && cards.some(c => c.rank === 'Joker_Black');
    if (isRocket(newPlay)) return true;
    if (isRocket(lastPlay)) return false;
    
    // Bomb beats non-bomb (except Rocket)
    const isBomb = (cards: PokerCard[]) => cards.length === 4 && cards.every(c => getDouDizhuRankValue(c.rank) === getDouDizhuRankValue(cards[0].rank));
    if (isBomb(newPlay) && !isBomb(lastPlay)) return true;
    if (!isBomb(newPlay) && isBomb(lastPlay)) return false;
    
    // Must be same type and length
    if (newPlay.length !== lastPlay.length) return false;
    
    // Compare primary value
    return getHandValue(newPlay) > getHandValue(lastPlay);
}

// Analyze Hand Structure for AI
interface HandAnalysis {
    rocket: PokerCard[];
    bombs: PokerCard[][];
    triplets: PokerCard[][];
    pairs: PokerCard[][];
    singles: PokerCard[];
    score: number;
}

// Improved Hand Decomposition for Turn Calculation
// Returns a list of "Hands" (PokerCard[]) that clears the deck
function decomposeHand(cards: PokerCard[]): PokerCard[][] {
    const hand = sortDouDizhuHand(cards);
    const result: PokerCard[][] = [];
    const counts = new Map<number, PokerCard[]>();
    
    // Group by rank
    hand.forEach(c => {
        const v = getDouDizhuRankValue(c.rank);
        if (!counts.has(v)) counts.set(v, []);
        counts.get(v)!.push(c);
    });
    
    const remaining = new Set<string>(hand.map(c => c.id));
    const useCards = (cardsToUse: PokerCard[]) => {
        cardsToUse.forEach(c => remaining.delete(c.id));
        result.push(cardsToUse);
        // Update counts
        cardsToUse.forEach(c => {
             const v = getDouDizhuRankValue(c.rank);
             const list = counts.get(v);
             if (list) {
                 const idx = list.findIndex(x => x.id === c.id);
                 if (idx !== -1) list.splice(idx, 1);
             }
        });
    };
    
    // 1. Extract Rocket
    const jokers = hand.filter(c => remaining.has(c.id) && (c.rank === 'Joker_Black' || c.rank === 'Joker_Red'));
    if (jokers.length === 2) {
        useCards(jokers);
    }
    
    // 2. Extract Bombs
    for (const [rank, list] of counts.entries()) {
        if (list.length === 4) {
            useCards([...list]);
        }
    }
    
    // 3. Extract Straights (5+)
    // Greedy search for longest straight
    // This is complex because breaking pairs/triplets might be bad.
    // Heuristic: Only form straight from Singles if possible, or if it makes a very long straight.
    // For simplicity in this bot: Skip complex Straight detection for now or keep it simple.
    // Let's detect Straights from singles only first.
    // TODO: Better straight detection.
    
    // 4. Extract Triplets (with attachments)
    // Find all triplets
    const triplets: PokerCard[][] = [];
    for (const [rank, list] of counts.entries()) {
        if (list.length === 3) {
            triplets.push([...list]);
        }
    }
    
    // Use triplets
    // Try to attach Singles first, then Pairs
    // Collect available singles and pairs
    triplets.forEach(trip => {
        // Remove from counts first
        useCards(trip); // Just add base triplet for now, we will merge later or logic handles it?
        // Actually decomposeHand should return Valid Plays.
        // Triplet+1 is a valid play.
        // We need to attach things.
    });
    
    // Re-scan for leftovers
    // 5. Pairs
    for (const [rank, list] of counts.entries()) {
        if (list.length === 2) {
            useCards([...list]);
        }
    }
    
    // 6. Singles
    for (const [rank, list] of counts.entries()) {
        if (list.length === 1) {
            useCards([...list]);
        }
    }
    
    // Optimization: Merge Triplets with Singles/Pairs to reduce turn count
    // This is a post-processing step on 'result'
    // Count Triplets, Singles, Pairs
    let tripIndices: number[] = [];
    let singleIndices: number[] = [];
    let pairIndices: number[] = [];
    
    result.forEach((r, i) => {
        if (r.length === 3 && r[0].rank === r[1].rank) tripIndices.push(i);
        else if (r.length === 1) singleIndices.push(i);
        else if (r.length === 2 && r[0].rank === r[1].rank && r[0].rank !== 'Joker_Red') pairIndices.push(i); // Rocket is not a pair for attachment
    });
    
    // Merge
    // Prefer attaching small singles
    // We need to reconstruct the result array.
    // Actually, just calculating the NUMBER of turns is enough for the bot?
    // The prompt says "analyze best way to play out".
    // Let's just return the count estimate.
    
    return result;
}

function estimateTurns(cards: PokerCard[]): number {
    const decomposed = decomposeHand(cards);
    let turns = decomposed.length;
    
    // Optimize Triplets
    let triplets = 0;
    let singles = 0;
    let pairs = 0;
    
    decomposed.forEach(h => {
        if (h.length === 3 && h[0].rank === h[1].rank) triplets++;
        else if (h.length === 1) singles++;
        else if (h.length === 2 && h[0].rank === h[1].rank && !h.some(c => c.rank.toString().startsWith('Joker'))) pairs++;
    });
    
    // Each triplet can carry 1 single or 1 pair
    while (triplets > 0) {
        if (singles > 0) {
            singles--;
            turns--; // Merged
        } else if (pairs > 0) {
            pairs--;
            turns--; // Merged
        }
        triplets--;
    }
    
    // Four with Two? (Bomb carries 2 singles or 2 pairs)
    // Only if allowed and optimal. Usually Bomb is better as Bomb (Invincible turn).
    // So keep Bombs as turns.
    
    return turns;
}

function estimateRisk(play: PokerCard[], remainingRanks: { [rank: number]: number }, isTeammateNext: boolean): number {
    // Risk = Probability of being blocked by Enemy
    // If isTeammateNext, check NextNext (Enemy)
    // If !isTeammateNext, check Next (Enemy)
    
    // Simple heuristic: Count how many hands in 'remainingRanks' can beat 'play'.
    // Then normalize by some factor.
    
    if (play.length === 0) return 0;
    
    const playVal = getHandValue(play);
    let blockerCount = 0;
    
    // 1. Single
    if (play.length === 1) {
        if (play[0].rank === 'Joker_Red') return 0;
        // Count cards > playVal
        for (let r = playVal + 1; r <= 17; r++) {
            blockerCount += remainingRanks[r] || 0;
        }
    }
    // 2. Pair
    else if (play.length === 2 && play[0].rank === play[1].rank) {
        // Count pairs > playVal
        for (let r = playVal + 1; r <= 15; r++) { // No pairs of Jokers usually (except Rocket)
            if ((remainingRanks[r] || 0) >= 2) blockerCount++;
        }
    }
    // 3. Triplet
    else if (play.length === 3) {
        for (let r = playVal + 1; r <= 15; r++) {
            if ((remainingRanks[r] || 0) >= 3) blockerCount++;
        }
    }
    // 4. Bomb
    else if (play.length === 4 && play[0].rank === play[1].rank) {
        for (let r = playVal + 1; r <= 15; r++) {
            if ((remainingRanks[r] || 0) >= 4) blockerCount++;
        }
        // Rocket blocks Bomb
        if ((remainingRanks[16] || 0) > 0 && (remainingRanks[17] || 0) > 0) blockerCount++;
    }
    
    // If Rocket, risk is 0
    if (play.length === 2 && play.some(c => c.rank === 'Joker_Red') && play.some(c => c.rank === 'Joker_Black')) return 0;
    
    // Base Risk
    // Assume 2 enemies (worst case). Or 1 enemy.
    // If Teammate is next, we only care about 1 enemy.
    // If Enemy is next, we care about him blocking.
    // BlockerCount is total blocking hands available globally.
    // Probability ~ BlockerCount / (RemainingCards / 2) roughly.
    
    let risk = Math.min(1.0, blockerCount / 2); // Heuristic
    if (isTeammateNext) risk *= 0.5; // Lower risk if teammate sits next
    
    return risk;
}

function analyzeHand(cards: PokerCard[]): HandAnalysis {
    const sorted = sortDouDizhuHand(cards);
    const counts = new Map<number, PokerCard[]>();
    
    // Group by rank
    sorted.forEach(c => {
        const v = getDouDizhuRankValue(c.rank);
        if (!counts.has(v)) counts.set(v, []);
        counts.get(v)!.push(c);
    });
    
    const analysis: HandAnalysis = {
        rocket: [],
        bombs: [],
        triplets: [],
        pairs: [],
        singles: [],
        score: 0
    };
    
    // 1. Find Rocket
    const jokers = sorted.filter(c => c.rank === 'Joker_Black' || c.rank === 'Joker_Red');
    if (jokers.length === 2) {
        analysis.rocket = jokers;
        analysis.score += 10;
        // Remove jokers from counts
        counts.delete(16);
        counts.delete(17);
    }
    
    // 2. Find Bombs (4 of a kind)
    for (const [rank, group] of counts.entries()) {
        if (group.length === 4) {
            analysis.bombs.push(group);
            analysis.score += 8;
            counts.delete(rank);
        }
    }
    
    // 3. Find Triplets (3 of a kind)
    for (const [rank, group] of counts.entries()) {
        if (group.length === 3) {
            analysis.triplets.push(group);
            analysis.score += 4; // Base score
            // Bonus for high triplets
            if (rank >= 14) analysis.score += 2;
            counts.delete(rank);
        }
    }
    
    // 4. Find Pairs
    for (const [rank, group] of counts.entries()) {
        if (group.length === 2) {
            analysis.pairs.push(group);
            analysis.score += 2;
            if (rank >= 14) analysis.score += 2;
            counts.delete(rank);
        }
    }
    
    // 5. Remaining are Singles (or leftover from broken groups if we did that, but here we strictly grouped)
    // Actually, if we had 3 cards and didn't use them as triplet, they would be here. But we prioritized triplet.
    // What if we have 4 cards? We used as bomb.
    // What if we have 1 card?
    for (const [rank, group] of counts.entries()) {
        if (group.length === 1) {
            analysis.singles.push(group[0]);
            const val = getDouDizhuRankValue(group[0].rank);
            if (val >= 14) analysis.score += 3; // High singles are good
            else if (val < 10) analysis.score -= 1; // Small singles are bad
        }
    }
    
    // Sort everything small to big for playing logic
    const sortByRank = (a: PokerCard[], b: PokerCard[]) => getDouDizhuRankValue(a[0].rank) - getDouDizhuRankValue(b[0].rank);
    analysis.bombs.sort(sortByRank);
    analysis.triplets.sort(sortByRank);
    analysis.pairs.sort(sortByRank);
    analysis.singles.sort((a, b) => getDouDizhuRankValue(a.rank) - getDouDizhuRankValue(b.rank));
    
    return analysis;
}

class DouDizhuLogic implements GameLogic {
    minPlayers = 3;
    maxPlayers = 3; 
    
    constructor(private settings: any) {}

    init(players: Player[], settings?: any): GameState {
        const deck = shuffle(createDouDizhuDeck());
        const { hands, remainingDeck } = deal(deck, 17, 3);
        
        const handsMap: { [key: string]: PokerCard[] } = {};
        players.forEach((p, i) => {
            handsMap[p.id] = sortDouDizhuHand(hands[i]);
        });

        const data: PokerData = {
            deck: [],
            discardPile: [],
            hands: handsMap,
            pot: 0,
            currentBet: 0,
            bottomCards: remainingDeck,
            currentPlayerIndex: Math.floor(Math.random() * 3), 
            direction: 1,
            ruleState: {
                phase: 'bidding', 
                currentBid: 0,
                lastBidder: null,
                passCount: 0,
                lastPlay: null, // { playerId, cards: [] }
                lastPlayPlayerId: null, // Player who played the last valid hand
                playedCards: {},
                bids: {},
                playedCardHistory: []
            },
            settings: { rule: 'doudizhu', ...settings }
        };

        return {
            id: '',
            type: 'poker',
            players,
            status: 'playing',
            currentTurn: players[data.currentPlayerIndex].id,
            gameData: data
        };
    }

    makeMove(state: GameState, playerId: string, move: any): GameState {
        if (state.status !== 'playing') return state;
        
        return produce(state, (draft) => {
            const data = draft.gameData as PokerData;
            
            // Phase 1: Bidding
            if (data.ruleState.phase === 'bidding') {
                if (draft.currentTurn !== playerId) return;
                
                if (move.action === 'bid') {
                    const score = move.score as number; // 0, 1, 2, 3
                    
                    data.ruleState.bids[playerId] = score;
                    
                    if (score > data.ruleState.currentBid) {
                        data.ruleState.currentBid = score;
                        data.ruleState.lastBidder = playerId;
                    }
                    
                    // If score is 3, ends immediately
                    if (score === 3) {
                        data.landlordId = playerId;
                        data.multiplier = 3;
                        data.hands[playerId].push(...(data.bottomCards || []));
                        data.hands[playerId] = sortDouDizhuHand(data.hands[playerId]);
                        
                        data.ruleState.phase = 'playing';
                        data.ruleState.lastPlayPlayerId = playerId; // Landlord starts
                        // currentTurn stays with landlord
                        return;
                    }
                    
                    // Check if all players have bid
                    const bidCount = Object.keys(data.ruleState.bids).length;
                    if (bidCount === 3) {
                        // Bidding over
                        if (data.ruleState.lastBidder) {
                             const winner = data.ruleState.lastBidder;
                             data.landlordId = winner;
                             data.multiplier = data.ruleState.currentBid;
                             data.hands[winner].push(...(data.bottomCards || []));
                             data.hands[winner] = sortDouDizhuHand(data.hands[winner]);
                             
                             data.ruleState.phase = 'playing';
                             data.ruleState.lastPlayPlayerId = winner;
                             draft.currentTurn = winner;
                        } else {
                            // No one bid? Redeal.
                            // Collect all cards
                            let allCards: PokerCard[] = [];
                            Object.values(data.hands).forEach(h => allCards.push(...h));
                            if (data.bottomCards) allCards.push(...data.bottomCards);

                            // Shuffle
                            allCards = shuffle(allCards);

                            // Redeal (Assumes 3 players)
                            const p1 = allCards.slice(0, 17);
                            const p2 = allCards.slice(17, 34);
                            const p3 = allCards.slice(34, 51);
                            const bottom = allCards.slice(51, 54);

                            // Assign to players in order
                            data.hands[state.players[0].id] = sortDouDizhuHand(p1);
                            data.hands[state.players[1].id] = sortDouDizhuHand(p2);
                            data.hands[state.players[2].id] = sortDouDizhuHand(p3);
                            data.bottomCards = bottom;

                            // Reset Bidding State
                            data.ruleState.bids = {};
                            data.ruleState.currentBid = 0;
                            data.ruleState.lastBidder = null;
                            
                            // Rotate start player for next deal
                            const currentStartIdx = state.players.findIndex(p => p.id === draft.currentTurn);
                            const nextStartIdx = (currentStartIdx + 1) % state.players.length;
                            draft.currentTurn = state.players[nextStartIdx].id;
                            
                            // Return early to let new bidding start
                            return;
                        }
                    } else {
                        // Next bidder
                        const playerIndex = state.players.findIndex(p => p.id === playerId);
                        const nextIndex = getNextPlayerIndex(state.players.length, playerIndex);
                        draft.currentTurn = state.players[nextIndex].id;
                    }
                }
                return;
            }
            
            // Phase 2: Playing
            if (draft.currentTurn !== playerId) return;
            
            const playerIndex = state.players.findIndex(p => p.id === playerId);
            
            // Pass Logic
            if (move.action === 'pass') {
                // Cannot pass if you are the leader (lastPlayPlayerId === playerId or null)
                if (data.ruleState.lastPlayPlayerId === playerId || data.ruleState.lastPlayPlayerId === null) {
                    return; // Must play
                }
                
                data.ruleState.playedCards[playerId] = 'pass';
                
                // Advance turn
                const nextIndex = getNextPlayerIndex(state.players.length, playerIndex);
                draft.currentTurn = state.players[nextIndex].id;
                
                return;
            }
            
            // Play Logic
            if (move.action === 'play') {
                const cardIds = move.cardIds as string[];
                if (!cardIds || cardIds.length === 0) return;
                
                const hand = data.hands[playerId];
                const cardsToPlay = hand.filter(c => cardIds.includes(c.id));
                
                if (cardsToPlay.length !== cardIds.length) return; // Should not happen
                
                // 1. Validate Play Type
                if (!isValidPlay(cardsToPlay)) return;
                
                // Check if leading
                const isLeader = data.ruleState.lastPlayPlayerId === playerId || data.ruleState.lastPlayPlayerId === null;

                // 2. Compare with Last Play (if not leading)
                if (!isLeader) {
                    if (data.ruleState.lastPlay && !isGreater(cardsToPlay, data.ruleState.lastPlay)) {
                        return; // Not big enough
                    }
                }
                
                // Valid Play Executed
                // Remove cards from hand
                data.hands[playerId] = hand.filter(c => !cardIds.includes(c.id));
                
                // Update Last Play
                data.ruleState.lastPlay = cardsToPlay;
                data.ruleState.lastPlayPlayerId = playerId;
                
                // Track played cards
                if (!data.ruleState.playedCardHistory) {
                    data.ruleState.playedCardHistory = [];
                }
                data.ruleState.playedCardHistory.push(...cardsToPlay);
                
                // Update Display
                if (isLeader) {
                    // Start of new round: Clear others' plays
                    data.ruleState.playedCards = {};
                }
                data.ruleState.playedCards[playerId] = cardsToPlay;
                
                // Check Win
                if (data.hands[playerId].length === 0) {
                    draft.status = 'finished';
                    // Determine if Landlord or Peasants won
                    if (playerId === data.landlordId) {
                        draft.winner = '地主';
                    } else {
                        draft.winner = '农民';
                    }
                    return;
                }
                
                // Advance Turn
                const nextIndex = getNextPlayerIndex(state.players.length, playerIndex);
                draft.currentTurn = state.players[nextIndex].id;
            }
        });
    }

    checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
        const data = state.gameData as PokerData;
        for (const p of state.players) {
            if (data.hands[p.id] && data.hands[p.id].length === 0) {
                // Someone has 0 cards
                const isLandlord = p.id === data.landlordId;
                return { winner: isLandlord ? '地主' : '农民', status: 'finished' };
            }
        }
        return { winner: null, status: 'playing' };
    }

    getBotMove(state: GameState, botId: string): any {
        const data = state.gameData as PokerData;
        const hand = data.hands[botId];
        const analysis = analyzeHand(hand);
        
        // Bidding Phase Bot
        if (data.ruleState.phase === 'bidding') {
             // Bid based on score
             // Basic threshold:
             // > 15: Bid 3
             // > 10: Bid 2
             // > 5: Bid 1
             // Else: 0
             // Add randomness
             const score = analysis.score + Math.random() * 5;
             if (score > 20) return { action: 'bid', score: 3 };
             if (score > 12) return { action: 'bid', score: 2 };
             if (score > 6) return { action: 'bid', score: 1 };
             return { action: 'bid', score: 0 };
        }
        
        // Playing Phase Bot
        const isLeader = data.ruleState.lastPlayPlayerId === botId || data.ruleState.lastPlayPlayerId === null;
        
        // --- Advanced Bot Context ---
        const myRole = botId === data.landlordId ? 'landlord' : 'peasant';
        
        // Find next and previous players
        const myIdx = state.players.findIndex(p => p.id === botId);
        const nextIdx = (myIdx + 1) % state.players.length;
        const prevIdx = (myIdx - 1 + state.players.length) % state.players.length;
        
        const nextPlayer = state.players[nextIdx];
        const prevPlayer = state.players[prevIdx];
        
        const nextRole = nextPlayer.id === data.landlordId ? 'landlord' : 'peasant';
        const prevRole = prevPlayer.id === data.landlordId ? 'landlord' : 'peasant';
        
        const nextIsTeammate = nextRole === myRole;
        const prevIsTeammate = prevRole === myRole;
        
        const nextHandCount = data.hands[nextPlayer.id].length;
        const prevHandCount = data.hands[prevPlayer.id].length;
        
        // --- Card Tracking & Probability ---
        // Calculate remaining cards outside of my hand
        const myHandIds = hand.map(c => c.id);
        const playedIds = data.ruleState.playedCardHistory?.map(c => c.id) || [];
        // Visible cards = My Hand + Played Cards + (Bottom Cards if Landlord exists)
        // Actually Bottom Cards are visible to everyone after bidding
        const bottomIds = data.bottomCards?.map(c => c.id) || [];
        
        // Count remaining ranks
        const remainingRanks: { [rank: number]: number } = {};
        // Initialize full deck counts (1 deck)
        // 3-10, J, Q, K, A, 2: 4 each. Jokers: 1 each.
        for (let r = 3; r <= 15; r++) remainingRanks[r] = 4;
        remainingRanks[16] = 1; // Black Joker
        remainingRanks[17] = 1; // Red Joker
        
        // Subtract visible cards
        const subtractCard = (c: PokerCard) => {
             const v = getDouDizhuRankValue(c.rank);
             if (remainingRanks[v] > 0) remainingRanks[v]--;
        };
        
        hand.forEach(subtractCard);
        data.ruleState.playedCardHistory?.forEach(subtractCard);
        if (data.landlordId) {
             data.bottomCards?.forEach(subtractCard);
        }
        
        // Analyze "Threats"
        // Are there potential Bombs left?
        let possibleBombs = 0;
        let possibleRocket = (remainingRanks[16] > 0 && remainingRanks[17] > 0);
        for (const [rank, count] of Object.entries(remainingRanks)) {
             if (count === 4) possibleBombs++;
        }
        
        // Check for specific big cards remaining
        const hasBigJokerLeft = remainingRanks[17] > 0;
        const hasSmallJokerLeft = remainingRanks[16] > 0;
        const twosLeft = remainingRanks[15];
        const acesLeft = remainingRanks[14];
        
        // --- Strategy Logic ---

        if (isLeader) {
            // 0. Instant Win Check
            if (isValidPlay(hand)) {
                return { action: 'play', cardIds: hand.map(c => c.id) };
            }

            // --- Advanced Search for Best Move ---
            // Generate Candidate Moves
            const candidates: { action: string, cardIds: string[], score: number }[] = [];
            
            // 1. Try Playing Singles
            if (analysis.singles.length > 0) {
                // Smallest Single
                candidates.push({ action: 'play', cardIds: [analysis.singles[0].id], score: 0 });
                // Largest Single (if blocking) - handled by score logic? No, just add candidates.
                if (analysis.singles.length > 1) {
                    candidates.push({ action: 'play', cardIds: [analysis.singles[analysis.singles.length-1].id], score: 0 });
                }
            }
            
            // 2. Try Playing Pairs
            if (analysis.pairs.length > 0) {
                candidates.push({ action: 'play', cardIds: analysis.pairs[0].map(c => c.id), score: 0 });
            }
            
            // 3. Try Playing Triplets (with best kicker)
            if (analysis.triplets.length > 0) {
                const trip = analysis.triplets[0];
                const tripIds = trip.map(c => c.id);
                
                // Triplet Only
                candidates.push({ action: 'play', cardIds: tripIds, score: 0 });
                
                // Triplet + Single
                if (analysis.singles.length > 0) {
                    candidates.push({ action: 'play', cardIds: [...tripIds, analysis.singles[0].id], score: 0 });
                }
                
                // Triplet + Pair
                if (analysis.pairs.length > 0) {
                    candidates.push({ action: 'play', cardIds: [...tripIds, ...analysis.pairs[0].map(c => c.id)], score: 0 });
                }
            }
            
            // 4. Try Playing Bomb/Rocket (only if necessary or good?)
            // Usually don't lead with Bomb unless it's to win or clear hands.
            // Add smallest bomb as candidate
            if (analysis.bombs.length > 0) {
                candidates.push({ action: 'play', cardIds: analysis.bombs[0].map(c => c.id), score: 0 });
            }
            
            // 5. Try Playing Sequence? (Simplified: Just use what we have from analysis if we added Sequence detection)
            // For now, rely on decomposition or just standard types.
            
            // Evaluate Candidates
            let bestMove = candidates[0];
            let minScore = Infinity;
            
            // Fallback
            if (candidates.length === 0) {
                 return { action: 'play', cardIds: [hand[0].id] };
            }
            
            for (const move of candidates) {
                // Simulate Hand after move
                const moveIds = new Set(move.cardIds);
                const remainingHand = hand.filter(c => !moveIds.has(c.id));
                
                // 1. Calculate Remaining Turns
                const turns = estimateTurns(remainingHand);
                
                // 2. Calculate Risk (Prob of being blocked)
                // Reconstruct play cards
                const playCards = hand.filter(c => moveIds.has(c.id));
                const risk = estimateRisk(playCards, remainingRanks, nextIsTeammate);
                
                // Score Formula
                // Score = Turns + Risk * Weight
                
                // Add Control Penalty to discourage wasting big cards early (unless it's an instant win)
                let controlPenalty = 0;
                // Calculate max rank in the play
                const playRankVals = playCards.map(c => getDouDizhuRankValue(c.rank));
                const maxRank = Math.max(...playRankVals);
                
                // Penalize playing high cards as Leader
                if (maxRank === 17) controlPenalty = 3.0; // Big Joker
                else if (maxRank === 16) controlPenalty = 2.5; // Small Joker
                else if (maxRank === 15) controlPenalty = 1.5; // 2
                else if (maxRank === 14) controlPenalty = 0.5; // A
                
                // Penalize playing Bomb as Leader (save for defense/interrupts)
                // Unless it's a Rocket (handled by maxRank=17/16 penalty above? No, Rocket is 16+17)
                const isBomb = playCards.length === 4 && playCards[0].rank === playCards[1].rank;
                if (isBomb) {
                     controlPenalty = Math.max(controlPenalty, 2.0);
                }
                
                const score = turns + risk * 1.5 + controlPenalty;
                
                if (score < minScore) {
                    minScore = score;
                    bestMove = move;
                }
            }
            
            // Special Override: Cooperative Play (Downstream Teammate with 1 card)
            if (nextIsTeammate && nextHandCount === 1) {
                 // Force play smallest single if available
                 if (analysis.singles.length > 0) return { action: 'play', cardIds: [analysis.singles[0].id] };
                 if (analysis.pairs.length > 0) return { action: 'play', cardIds: [analysis.pairs[0][0].id] }; // Break pair
                 return { action: 'play', cardIds: [hand[hand.length-1].id] };
            }
            
            // Special Override: Blocking Play (Downstream Enemy with 1 card)
            if (!nextIsTeammate && nextHandCount === 1) {
                 // Filter out small singles from bestMove if selected
                 // Or just re-run selection with restriction?
                 // Simple check:
                 if (bestMove.cardIds.length === 1) {
                     const rank = getDouDizhuRankValue(hand.find(c => c.id === bestMove.cardIds[0])!.rank);
                     if (rank < 10) {
                         // Too small! Pick something else.
                         // Try to find a move that is NOT a small single.
                         // Prioritize non-singles.
                         const safeMoves = candidates.filter(m => m.cardIds.length > 1 || getDouDizhuRankValue(hand.find(c => c.id === m.cardIds[0])!.rank) > 10);
                         if (safeMoves.length > 0) {
                             // Re-evaluate safe moves
                             // Or just pick first safe one?
                             // Let's pick best safe one.
                             let bestSafe = safeMoves[0];
                             let minSafeScore = Infinity;
                             for (const m of safeMoves) {
                                 // Re-calc score
                                 const mIds = new Set(m.cardIds);
                                 const rem = hand.filter(c => !mIds.has(c.id));
                                 const t = estimateTurns(rem);
                                 const p = hand.filter(c => mIds.has(c.id));
                                 const r = estimateRisk(p, remainingRanks, nextIsTeammate);
                                 const s = t + r * 1.5;
                                 if (s < minSafeScore) {
                                     minSafeScore = s;
                                     bestSafe = m;
                                 }
                             }
                             return bestSafe;
                         }
                     }
                 }
            }

            return bestMove;
        } else {
            // Following Logic
            const lastPlay = data.ruleState.lastPlay!;
            const lastPlayerId = data.ruleState.lastPlayPlayerId!;
            const lastVal = getHandValue(lastPlay);
            
            const isLastPlayTeammate = (lastPlayerId === data.landlordId) ? (myRole === 'landlord') : (myRole === 'peasant');

            // 1. Teammate Check
            if (isLastPlayTeammate) {
                // Determine our position relative to Landlord
                // Scenario A: I am Downstream of Landlord (Next is Teammate).
                // Teammate (Upstream) -> Landlord (Passed) -> Me -> Teammate
                // The Landlord failed to beat Teammate's card.
                if (nextIsTeammate) {
                    // Rule: Always PASS to let Teammate continue holding the lead.
                    // Exceptions could be added (e.g., I can win immediately), but generally Pass is safe.
                    return { action: 'pass' };
                }
                
                // Scenario B: I am Upstream of Landlord (Next is Landlord).
                // Teammate (Downstream) -> Me -> Landlord
                // My job is to "Block" (顶牌) to force Landlord to play high cards.
                else {
                    // Check Teammate's Play Strength
                    // If Teammate played a Strong Card (J, Q, K, A, 2, Joker, Bomb):
                    // They want to force the Landlord or take control.
                    // I should PASS and let the Landlord deal with it.
                    // Threshold: J (Rank Value 11)
                    if (lastVal >= 11 || (lastPlay.length === 4 && lastPlay[0].rank === lastPlay[1].rank)) {
                        return { action: 'pass' };
                    }
                    
                    // If Teammate played a Weak Card (3-10):
                    // Landlord might beat this cheaply (e.g., beat 3 with 5).
                    // I should BLOCK with a Strong Card (J, Q, K, A) to force Landlord to use a big card.
                    // Do NOT play a small card (e.g., beat 3 with 4) as it helps the Landlord.
                    
                    if (lastPlay.length === 1) {
                         // Find a blocking Single (> 10, i.e., J or higher)
                         const blocker = analysis.singles.find(c => getDouDizhuRankValue(c.rank) >= 11 && getDouDizhuRankValue(c.rank) > lastVal);
                         if (blocker) {
                             return { action: 'play', cardIds: [blocker.id] };
                         }
                         // If I can't block high, Pass. (Don't play small).
                         return { action: 'pass' };
                    }
                    
                    if (lastPlay.length === 2) {
                        // Find a blocking Pair (> 10)
                        const blocker = analysis.pairs.find(p => getDouDizhuRankValue(p[0].rank) >= 11 && getDouDizhuRankValue(p[0].rank) > lastVal);
                        if (blocker) {
                            return { action: 'play', cardIds: blocker.map(c => c.id) };
                        }
                        return { action: 'pass' };
                    }

                    // For Triplets/others, usually Pass unless we have a great hand.
                    return { action: 'pass' };
                }
            }
            
            // 2. Enemy Check
            // Special Case: Enemy (Downstream) has 1 card left.
            // If I am following a Single played by Enemy (Upstream).
            // I MUST beat it with a High Single to block Downstream Enemy from winning cheap.
            if (!nextIsTeammate && nextHandCount === 1 && lastPlay.length === 1) {
                 // Try to find a Safe Beat (> 10 or J)
                 // Use tracking to know if opponent has Big Joker?
                 // If Big Joker is gone, Small Joker is king.
                 // If 2s are gone, A is king.
                 
                 // Find max possible remaining card
                 let maxRemaining = 0;
                 for (let r = 17; r >= 3; r--) {
                     if (remainingRanks[r] > 0) {
                         maxRemaining = r;
                         break;
                     }
                 }
                 
                 // If I have a card >= maxRemaining, it is unbeatable.
                 const unbeatableSingle = analysis.singles.find(c => getDouDizhuRankValue(c.rank) >= maxRemaining);
                 if (unbeatableSingle && getDouDizhuRankValue(unbeatableSingle.rank) > lastVal) {
                      return { action: 'play', cardIds: [unbeatableSingle.id] };
                 }

                 const safeBeats = analysis.singles.filter(c => getDouDizhuRankValue(c.rank) > lastVal && getDouDizhuRankValue(c.rank) > 10);
                 if (safeBeats.length > 0) {
                     return { action: 'play', cardIds: [safeBeats[0].id] }; // Smallest Safe Beat
                 }
                 
                 // If no safe beat, try Max Single?
                 // Or break pair/triplet?
                 // Let's try Max Single from analysis.singles
                 const validBeats = analysis.singles.filter(c => getDouDizhuRankValue(c.rank) > lastVal);
                 if (validBeats.length > 0) {
                     return { action: 'play', cardIds: [validBeats[validBeats.length-1].id] };
                 }
                 
                 // If I have Rocket, I can split it to play Small Joker (Single).
                 // Wait, Rocket is Jokers. Big Joker > Small Joker > 2.
                 // If I have Rocket, I have Big Joker and Small Joker.
                 // Small Joker is the biggest possible card the enemy can see (because I hold the Big Joker).
                 // So Small Joker is effectively the Nuts (unbeatable).
                 // Playing Small Joker saves the Big Joker for later (higher value).
                 // Also, playing Small Joker might induce enemy to think Big Joker is elsewhere? No, logic is simple:
                 // Small Joker wins. Big Joker wins. Small Joker is lower value card. So play Small Joker.
                 if (analysis.rocket.length > 0) {
                      // Play Small Joker
                      const smallJoker = analysis.rocket.find(c => c.rank === 'Joker_Black');
                      if (smallJoker) return { action: 'play', cardIds: [smallJoker.id] };
                 }

                 // If still no beat, consider Bomb/Rocket if critical?
                 if (analysis.rocket.length > 0) {
                      return { action: 'play', cardIds: analysis.rocket.map(c => c.id) };
                 }
                
                // If I have a Bomb, use it
                if (analysis.bombs.length > 0) {
                     return { action: 'play', cardIds: analysis.bombs[0].map(c => c.id) };
                }

                // Pass if can't block effectively.
            }
            
            // Special Case: Enemy (Downstream) has 2 cards left.
            // They likely have a Pair.
            // If lastPlay is Single, I should try to play a single to force them to break pair?
            // Or if lastPlay is Pair, I MUST beat it.
            if (!nextIsTeammate && nextHandCount === 2 && lastPlay.length === 2) {
                 // Must beat pair if possible
                 // Use normal logic but prioritize it
            }
            
            // Normal Beat Logic (Try to win cheaply)
            
            // 1. Single
            if (lastPlay.length === 1) {
                // Find smallest single > lastVal
                const bestSingle = analysis.singles.find(c => getDouDizhuRankValue(c.rank) > lastVal);
                if (bestSingle) return { action: 'play', cardIds: [bestSingle.id] };
                
                // If no single, try to break a pair? (Only if 2 or A?)
                // Simple bot: Don't break structure usually.
            }
            
            // 2. Pair
            else if (lastPlay.length === 2 && isValidPlay(lastPlay)) { // Normal Pair
                 const bestPair = analysis.pairs.find(p => getDouDizhuRankValue(p[0].rank) > lastVal);
                 if (bestPair) return { action: 'play', cardIds: bestPair.map(c => c.id) };
            }
            
            // 3. Triplet
            else if (lastPlay.length === 3) {
                 const bestTrip = analysis.triplets.find(t => getDouDizhuRankValue(t[0].rank) > lastVal);
                 if (bestTrip) return { action: 'play', cardIds: bestTrip.map(c => c.id) };
            }
            
            // 4. Triplet + Single
            else if (lastPlay.length === 4 && isValidPlay(lastPlay)) {
                 // Need Triplet > lastVal and a Single
                 const bestTrip = analysis.triplets.find(t => getDouDizhuRankValue(t[0].rank) > lastVal);
                 if (bestTrip && analysis.singles.length > 0) {
                     return { action: 'play', cardIds: [...bestTrip.map(c => c.id), analysis.singles[0].id] };
                 }
            }
            
            // 5. Triplet + Pair
            else if (lastPlay.length === 5 && isValidPlay(lastPlay)) {
                 const bestTrip = analysis.triplets.find(t => getDouDizhuRankValue(t[0].rank) > lastVal);
                 if (bestTrip && analysis.pairs.length > 0) {
                     return { action: 'play', cardIds: [...bestTrip.map(c => c.id), ...analysis.pairs[0].map(c => c.id)] };
                 }
            }
            
            // 6. Bomb
            // Can beat anything (except higher bomb/rocket)
            // If lastPlay is NOT Bomb/Rocket, can use any Bomb
            // If lastPlay IS Bomb, need higher Bomb
            const isLastBomb = lastPlay.length === 4 && isValidPlay(lastPlay) && lastPlay.every(c => c.rank === lastPlay[0].rank); // Simple check
            const isLastRocket = lastPlay.length === 2 && lastPlay.some(c => c.rank === 'Joker_Red');
            
            if (!isLastRocket) {
                 if (isLastBomb) {
                     const bestBomb = analysis.bombs.find(b => getDouDizhuRankValue(b[0].rank) > lastVal);
                     if (bestBomb) return { action: 'play', cardIds: bestBomb.map(c => c.id) };
                 } else {
                     // Can use Bomb to beat normal hands
                     // Only use if lastPlay is high value (e.g. > 10) or random chance
                     if (lastVal > 10 || Math.random() > 0.5) {
                         if (analysis.bombs.length > 0) return { action: 'play', cardIds: analysis.bombs[0].map(c => c.id) };
                     }
                 }
            }
            
            // 7. Rocket
            if (analysis.rocket.length > 0 && !isLastRocket) {
                 return { action: 'play', cardIds: analysis.rocket.map(c => c.id) };
            }
            
            return { action: 'pass' };
        }
    }
    
    maskState(state: GameState, playerId: string): GameState {
        // If game is finished, reveal everything
        if (state.status === 'finished') return state;

        return produce(state, (draft) => {
            const data = draft.gameData as PokerData;
            
            // Mask Deck (should be empty in playing)
            
            // Mask Others Hands
            Object.keys(data.hands).forEach(pId => {
                if (pId !== playerId) {
                    data.hands[pId] = data.hands[pId].map((_, i) => ({
                        id: `unknown-${i}`,
                        type: 'poker',
                        suit: 'none',
                        rank: 2, // Dummy
                        isFaceUp: false
                    } as PokerCard));
                }
            });
            
            // Mask Bottom Cards if Bidding (In Playing they are usually public or visible to landlord, 
            // but standard rule is public after landlord takes them)
            // Current implementation: public.
        });
    }
}

export const DouDizhuRule: GameRuleDefinition = {
    meta: {
        id: 'doudizhu',
        name: '斗地主 (Dou Dizhu)',
        description: '二打一，经典玩法',
        minPlayers: 3,
        maxPlayers: 3,
        allowBots: true,
        settingsSchema: {
            showCards: { type: 'boolean', label: '明牌', default: false }
        }
    },
    createLogic: (settings) => new DouDizhuLogic(settings)
};
