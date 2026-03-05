
import { describe, test, expect } from 'vitest';
import { DouDizhuRule } from './doudizhu.ts';
import { PokerCard } from '../types.ts';
import { GameState } from '../../../types.ts';

// Helper to create cards
const c = (rank: any, suit: any = 'spades'): PokerCard => ({
    id: `${rank}-${suit}`,
    type: 'poker',
    suit,
    rank
});

describe('Dou Dizhu Logic', () => {
    const logic = DouDizhuRule.createLogic({});
    // Access private/internal functions if possible, or test via makeMove
    // Since we can't easily access private functions without exporting them or using 'any',
    // we will rely on checking if moves are accepted in makeMove or by creating a temporary instance.
    // Actually, isValidPlay is not exported. We should export it or test via makeMove.
    // But makeMove requires full state setup.
    // Let's modify doudizhu.ts to export helpers for testing? 
    // Or just test public API.
    
    // Better: Helper to setup state
    const setupState = (hand: PokerCard[]): GameState => {
        return {
            id: 'test',
            type: 'poker',
            status: 'playing',
            currentTurn: 'p1',
            players: [{id: 'p1', name: 'P1', avatar: ''}, {id: 'p2', name: 'P2', avatar: ''}, {id: 'p3', name: 'P3', avatar: ''}],
            gameData: {
                deck: [],
                discardPile: [],
                hands: { 'p1': hand },
                pot: 0,
                currentBet: 0,
                currentPlayerIndex: 0,
                direction: 1,
                ruleState: {
                    phase: 'playing',
                    lastPlay: null,
                    lastPlayPlayerId: null
                },
                settings: { rule: 'doudizhu' }
            }
        };
    };

    test('Validates Single Play', () => {
        const hand = [c(3)];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: [hand[0].id] });
        
        // If valid, hand should be empty
        expect((newState.gameData as any).hands['p1'].length).toBe(0);
    });

    test('Validates Pair Play', () => {
        const hand = [c(3, 'hearts'), c(3, 'spades')];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: [hand[0].id, hand[1].id] });
        expect((newState.gameData as any).hands['p1'].length).toBe(0);
    });

    test('Rejects Invalid Pair (Different Ranks)', () => {
        const hand = [c(3), c(4)];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: [hand[0].id, hand[1].id] });
        // Should not change
        expect((newState.gameData as any).hands['p1'].length).toBe(2);
    });

    test('Validates Triplet', () => {
        const hand = [c(3, 'hearts'), c(3, 'spades'), c(3, 'clubs')];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: hand.map(c => c.id) });
        expect((newState.gameData as any).hands['p1'].length).toBe(0);
    });

    test('Validates Triplet + 1', () => {
        const hand = [c(3, 'hearts'), c(3, 'spades'), c(3, 'clubs'), c(4)];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: hand.map(c => c.id) });
        expect((newState.gameData as any).hands['p1'].length).toBe(0);
    });

    test('Validates Straight', () => {
        const hand = [c(3), c(4), c(5), c(6), c(7)];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: hand.map(c => c.id) });
        expect((newState.gameData as any).hands['p1'].length).toBe(0);
    });
    
    test('Rejects Invalid Straight (Non-consecutive)', () => {
        const hand = [c(3), c(4), c(5), c(6), c(8)];
        const state = setupState(hand);
        const newState = logic.makeMove(state, 'p1', { action: 'play', cardIds: hand.map(c => c.id) });
        expect((newState.gameData as any).hands['p1'].length).toBe(5);
    });

    test('Bot Move: Leading Plays Smallest Single', () => {
        const hand = [c('A'), c(3)]; // 3 is smaller than A
        const state = setupState(hand);
        // Force bot to lead
        (state.gameData as any).ruleState.lastPlayPlayerId = 'p1';
        
        const move = logic.getBotMove(state, 'p1');
        expect(move.action).toBe('play');
        expect(move.cardIds[0]).toBe(hand[1].id); // Should be 3
    });

    test('Bot Move: Follows with Greater Single', () => {
        const hand = [c('K'), c(5)]; 
        const state = setupState(hand);
        // Last play was 4
        (state.gameData as any).ruleState.lastPlay = [c(4)];
        (state.gameData as any).ruleState.lastPlayPlayerId = 'p2';
        
        const move = logic.getBotMove(state, 'p1');
        expect(move.action).toBe('play');
        expect(move.cardIds[0]).toBe(hand[1].id); // Should be 5 (smallest > 4)
    });

    test('Bot Move: Passes if cannot beat', () => {
        const hand = [c(3)]; 
        const state = setupState(hand);
        // Last play was A
        (state.gameData as any).ruleState.lastPlay = [c('A')];
        (state.gameData as any).ruleState.lastPlayPlayerId = 'p2';
        
        const move = logic.getBotMove(state, 'p1');
        expect(move.action).toBe('pass');
    });
    
    test('Skip Restriction: Cannot pass if leading', () => {
        const hand = [c(3)];
        const state = setupState(hand);
        (state.gameData as any).ruleState.lastPlayPlayerId = 'p1';
        
        const newState = logic.makeMove(state, 'p1', { action: 'pass' });
        // Should return same state (rejected) or handle internally. 
        // My makeMove returns produce(state), if it returns early, it returns draft or original?
        // Immer produce: if you return nothing, it uses draft. If you return undefined, it uses draft.
        // Wait, my makeMove logic:
        // if (cannot pass) return;
        // This 'return' inside produce callback means "no changes".
        // So state should be same.
        // But check turn.
        expect(newState.currentTurn).toBe('p1'); // Turn should not change
    });
});
