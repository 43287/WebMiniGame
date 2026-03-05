
import { GameLogic } from '../../GameInterface.ts';

export interface GameRuleMeta {
    id: string;
    name: string;
    description?: string;
    minPlayers: number;
    maxPlayers: number;
    allowBots: boolean;
    // Schema for dynamic settings generation (can be used by UI)
    settingsSchema?: {
        [key: string]: {
            type: 'boolean' | 'number' | 'select';
            label: string;
            default: any;
            options?: { label: string; value: any }[]; // For select
            min?: number;
            max?: number;
        };
    };
}

export interface GameRuleDefinition {
    meta: GameRuleMeta;
    createLogic(settings: any): GameLogic;
}
