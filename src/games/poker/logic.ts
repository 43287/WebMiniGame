
import { GameLogic } from '../GameInterface.ts';
import { GameState, Player } from '../../types.ts';
import { GameRuleDefinition } from './rules/types.ts';
import { ZhaJinhuaRule } from './rules/zhajinhua.ts';
import { DouDizhuRule } from './rules/doudizhu.ts';
import { TexasHoldemRule } from './rules/texas.ts';

// Registry of available poker rules
export const RULES: { [key: string]: GameRuleDefinition } = {
    'zhajinhua': ZhaJinhuaRule,
    'doudizhu': DouDizhuRule,
    'texas': TexasHoldemRule
};

export class PokerLogic implements GameLogic {
    // Dynamic min/max players based on selected rule
    // We default to the most inclusive range, but init will validate
    minPlayers = 2;
    maxPlayers = 10;
    
    private currentRuleLogic: GameLogic | null = null;
    private currentRuleId: string = 'zhajinhua'; // Default

    constructor() {}

    init(players: Player[], settings?: any): GameState {
        console.log('PokerLogic.init called with settings:', settings);
        console.log('Available rules:', Object.keys(RULES));
        
        const ruleId = settings?.rule || 'zhajinhua';
        const ruleDef = RULES[ruleId];

        if (!ruleDef) {
            console.error(`Rule definition not found for id: ${ruleId}. Available: ${Object.keys(RULES).join(', ')}`);
            throw new Error(`Unknown poker rule: ${ruleId}`);
        }
        
        // Validate player count against rule
        if (players.length < ruleDef.meta.minPlayers || players.length > ruleDef.meta.maxPlayers) {
            throw new Error(`${ruleDef.meta.name} requires ${ruleDef.meta.minPlayers}-${ruleDef.meta.maxPlayers} players.`);
        }

        this.currentRuleId = ruleId;
        this.currentRuleLogic = ruleDef.createLogic(settings);
        
        // Delegate to rule logic
        return this.currentRuleLogic.init(players, settings);
    }

    makeMove(state: GameState, playerId: string, move: any): GameState {
        if (!this.currentRuleLogic) {
             // Try to restore logic from state if possible (not easy if stateless)
             // But usually logic instance is persistent in memory for the session
             // If this is a fresh instantiation (e.g. server restart), we need to re-create logic based on state
             const data = state.gameData as any;
             const ruleId = data.settings?.rule;
             if (ruleId && RULES[ruleId]) {
                 this.currentRuleLogic = RULES[ruleId].createLogic(data.settings);
             }
        }
        
        if (this.currentRuleLogic) {
            return this.currentRuleLogic.makeMove(state, playerId, move);
        }
        return state;
    }

    checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
        if (this.currentRuleLogic) {
            return this.currentRuleLogic.checkWin(state);
        }
        // Fallback or restore logic
        const data = state.gameData as any;
        const ruleId = data.settings?.rule;
        if (ruleId && RULES[ruleId]) {
             this.currentRuleLogic = RULES[ruleId].createLogic(data.settings);
             return this.currentRuleLogic.checkWin(state);
        }
        return { winner: null, status: 'playing' };
    }

    getBotMove(state: GameState, botId: string): any {
        if (this.currentRuleLogic) {
            return this.currentRuleLogic.getBotMove(state, botId);
        }
        return null;
    }
    
    maskState(state: GameState, playerId: string): GameState {
        if (this.currentRuleLogic && this.currentRuleLogic.maskState) {
            return this.currentRuleLogic.maskState(state, playerId);
        }
        return state;
    }
}

const logic = new PokerLogic();
export default logic;
