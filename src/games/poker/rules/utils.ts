
import { PokerCard, Rank, Suit } from '../types.ts';

export function getDouDizhuRankValue(rank: Rank): number {
    if (rank === 'Joker_Black') return 16;
    if (rank === 'Joker_Red') return 17;
    if (rank === 2) return 15;
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return typeof rank === 'number' ? rank : 0;
}

export function getSuitValue(suit: Suit): number {
    if (suit === 'hearts') return 4;
    if (suit === 'diamonds') return 3;
    if (suit === 'spades') return 2;
    if (suit === 'clubs') return 1;
    return 5;
}

/**
 * Sorts cards for Dou Dizhu.
 * Primary: Rank (Descending) -> 2, A, K ... 3
 * Secondary: Suit (Descending) -> Hearts, Diamonds, Spades, Clubs
 */
export function sortDouDizhuHand(cards: PokerCard[]): PokerCard[] {
    return [...cards].sort((a, b) => {
        const valA = getDouDizhuRankValue(a.rank);
        const valB = getDouDizhuRankValue(b.rank);
        
        if (valA !== valB) {
            return valB - valA; // Descending Value (Largest first)
        }
        
        const suitA = getSuitValue(a.suit);
        const suitB = getSuitValue(b.suit);
        return suitB - suitA; // Descending Suit (Hearts first)
    });
}

export function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
