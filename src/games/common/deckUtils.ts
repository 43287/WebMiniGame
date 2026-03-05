
import { BaseCard } from './types.ts';

/**
 * Shuffles an array of items (usually cards) using Fisher-Yates algorithm.
 * @param deck The array to shuffle.
 * @returns A new shuffled array.
 */
export function shuffle<T>(deck: T[]): T[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

/**
 * Deals cards to players.
 * @param deck The deck of cards.
 * @param count Number of cards per player.
 * @param numPlayers Number of players.
 * @returns An object with hands and the remaining deck.
 */
export function deal<T>(deck: T[], count: number, numPlayers: number): { hands: T[][], remainingDeck: T[] } {
    const hands: T[][] = Array(numPlayers).fill([]).map(() => []);
    const remainingDeck = [...deck];

    for (let i = 0; i < count; i++) {
        for (let p = 0; p < numPlayers; p++) {
            if (remainingDeck.length > 0) {
                hands[p].push(remainingDeck.pop()!);
            }
        }
    }
    
    return { hands, remainingDeck };
}

/**
 * Draws a card from the deck. If deck is empty, reshuffles discard pile.
 * @param deck Current deck.
 * @param discardPile Discard pile.
 * @returns The drawn card and the updated deck/discardPile.
 */
export function draw<T extends BaseCard>(deck: T[], discardPile: T[]): { card: T | null, newDeck: T[], newDiscardPile: T[] } {
    let newDeck = [...deck];
    let newDiscardPile = [...discardPile];
    
    if (newDeck.length === 0) {
        if (newDiscardPile.length <= 1) {
             return { card: null, newDeck, newDiscardPile };
        }
        
        // Keep top card
        const top = newDiscardPile.pop();
        // Shuffle rest
        newDeck = shuffle(newDiscardPile);
        newDiscardPile = [top!];
    }
    
    if (newDeck.length > 0) {
        const card = newDeck.pop()!;
        return { card, newDeck, newDiscardPile };
    }
    
    return { card: null, newDeck, newDiscardPile };
}
