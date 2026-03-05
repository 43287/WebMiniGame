import React from 'react';
import { Section, SettingItem, NumberSettingItem } from '../../../components/SettingsUI';
import { RULES } from '../logic';

interface PokerSettingsProps {
    settings: any;
    isHost: boolean;
    onUpdateSettings: (key: string, value: any, sideEffects?: (s: any) => void) => void;
}

export default function PokerSettings({ settings, isHost, onUpdateSettings }: PokerSettingsProps) {
    const currentRule = settings.rule || 'zhajinhua';
    const currentRuleDef = RULES[currentRule];

    return (
        <div className="flex flex-col gap-8 w-full max-w-md">
            {/* Rule Selection */}
            <Section title="玩法选择 🃏" color="bg-green-100">
                <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/50 rounded-lg transition-colors border-2 border-transparent hover:border-black/10">
                        <input 
                            type="radio" 
                            name="pokerRule" 
                            value="zhajinhua" 
                            checked={currentRule === 'zhajinhua'} 
                            onChange={() => onUpdateSettings('rule', 'zhajinhua')}
                            disabled={!isHost}
                            className="w-6 h-6 accent-black"
                        />
                        <div className="flex flex-col">
                            <span className="font-black text-lg">炸金花 (Zha Jinhua)</span>
                            <span className="text-xs text-gray-500 font-bold">2-5人 · 心理博弈 · 筹码竞技</span>
                        </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/50 rounded-lg transition-colors border-2 border-transparent hover:border-black/10">
                        <input 
                            type="radio" 
                            name="pokerRule" 
                            value="doudizhu" 
                            checked={currentRule === 'doudizhu'} 
                            onChange={() => onUpdateSettings('rule', 'doudizhu')}
                            disabled={!isHost}
                            className="w-6 h-6 accent-black"
                        />
                        <div className="flex flex-col">
                            <span className="font-black text-lg">斗地主 (Dou Dizhu)</span>
                            <span className="text-xs text-gray-500 font-bold">3人 · 二打一 · 经典玩法</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/50 rounded-lg transition-colors border-2 border-transparent hover:border-black/10">
                        <input 
                            type="radio" 
                            name="pokerRule" 
                            value="texas" 
                            checked={currentRule === 'texas'} 
                            onChange={() => onUpdateSettings('rule', 'texas')}
                            disabled={!isHost}
                            className="w-6 h-6 accent-black"
                        />
                        <div className="flex flex-col">
                            <span className="font-black text-lg">德州扑克 (Texas Hold'em)</span>
                            <span className="text-xs text-gray-500 font-bold">2-10人 · 心理博弈 · 经典竞技</span>
                        </div>
                    </label>
                </div>
            </Section>

            {/* Dynamic Rule Settings */}
            {currentRuleDef && currentRuleDef.meta.settingsSchema && (
                <Section title="规则设置 ⚙️" color="bg-yellow-100">
                    {Object.entries(currentRuleDef.meta.settingsSchema).map(([key, schema]) => {
                        const value = settings[key] !== undefined ? settings[key] : schema.default;
                        
                        if (schema.type === 'number') {
                            return (
                                <NumberSettingItem
                                    key={key}
                                    label={schema.label}
                                    value={value}
                                    min={schema.min}
                                    max={schema.max}
                                    onChange={(val) => onUpdateSettings(key, val)}
                                    disabled={!isHost}
                                />
                            );
                        }
                        
                        if (schema.type === 'boolean') {
                            return (
                                <SettingItem
                                    key={key}
                                    label={schema.label}
                                    description="" 
                                    checked={!!value}
                                    onChange={(val) => onUpdateSettings(key, val)}
                                    disabled={!isHost}
                                />
                            );
                        }
                        
                        return null;
                    })}
                </Section>
            )}
        </div>
    );
}
