import React from 'react';
import { Section, SettingItem } from '../../../components/SettingsUI';

interface TicTacToeSettingsProps {
    settings: any;
    isHost: boolean;
    onUpdateSettings: (key: string, value: any, sideEffects?: (s: any) => void) => void;
}

export default function TicTacToeSettings({ settings, isHost, onUpdateSettings }: TicTacToeSettingsProps) {
    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-md flex flex-col gap-6">
                 <Section title="游戏模式 🎮" color="bg-yellow-100">
                    <SettingItem
                        label="超级井字棋 (Super Mode)"
                        description="在 9x9 的大棋盘上进行，每一步都决定了对手下一步的落子区域！"
                        checked={!!settings.superMode}
                        onChange={(v) => onUpdateSettings('superMode', v, (s) => { if(v) s.coverMode = false; })}
                        disabled={!isHost || !!settings.coverMode}
                    />
                    
                    <SettingItem
                        label="覆盖井字棋 (Cover Mode)"
                        description="3x3 棋盘。小标志可以被大标志覆盖！每人拥有 3 个大标志。"
                        checked={!!settings.coverMode}
                        onChange={(v) => onUpdateSettings('coverMode', v, (s) => { if(v) s.superMode = false; })}
                        disabled={!isHost || !!settings.superMode}
                    />
                </Section>
            </div>
        </div>
    );
}
