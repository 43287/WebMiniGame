
import { BaseCard } from '../common/types.ts';

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'none'; // 'none' for Joker
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A' | 'Joker_Black' | 'Joker_Red';

export interface PokerCard extends BaseCard {
    suit: Suit;
    rank: Rank;
    isFaceUp?: boolean; // For showing backs
}

export interface PokerSettings {
    rule: 'zhajinhua' | 'doudizhu' | 'texas';
    // Common settings can go here, rule specific ones in their own schema
    // But for simplicity, we can just put everything here or use a dynamic object
    [key: string]: any; 
}

export interface PokerData {
    deck: PokerCard[];
    discardPile: PokerCard[];
    hands: { [playerId: string]: PokerCard[] };
    
    // Pot for betting games
    pot: number;
    currentBet: number;
    chips?: { [playerId: string]: number }; // Player chips for betting games
    
    // Landlord specific
    landlordId?: string;
    bottomCards?: PokerCard[];
    multiplier?: number;
    
    // Common Turn Info
    currentPlayerIndex: number; // To track turn order explicitly if needed, or rely on GameState.currentTurn
    direction: 1 | -1;
    
    // Rule Specific State
    ruleState: {
        phase: 'bidding' | 'playing';
        currentBid: number; // 0, 1, 2, 3
        lastBidder: string | null;
        passCount: number;
        lastPlay: PokerCard[] | null;
        lastPlayPlayerId: string | null;
        // Map of playerId -> cards played in the current trick (or 'pass')
        // Used for UI display. Cleared when a new trick starts (leader plays).
        playedCards: { [playerId: string]: PokerCard[] | 'pass' };
        bids: { [playerId: string]: number | 'pass' }; // Track bids
    }; 
    
    settings: PokerSettings;
}
