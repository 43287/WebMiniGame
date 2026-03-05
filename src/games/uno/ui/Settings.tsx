import React from 'react';
import { Section, SettingItem, SubSettingItem } from '../../../components/SettingsUI';

interface UnoSettingsProps {
    settings: any;
    isHost: boolean;
    onUpdateSettings: (key: string, value: any, sideEffects?: (s: any) => void) => void;
}

export default function UnoSettings({ settings, isHost, onUpdateSettings }: UnoSettingsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Column 1: Core Mechanics */}
            <div className="flex flex-col gap-6">
                <Section title="摸牌机制 🃏" color="bg-blue-100">
                    <SettingItem
                        label="叠加惩罚 (Stacking)"
                        description="允许用 +2 回应 +2，将惩罚转移给下家。"
                        checked={!!settings.stackDraw}
                        onChange={(v) => onUpdateSettings('stackDraw', v, (s) => { if (!v) s.stackPlus4OnPlus2 = false; })}
                        disabled={!isHost}
                    >
                         <SubSettingItem
                            label="+4 叠加 +2"
                            description="允许用 +4 回应 +2（更刺激！）。"
                            checked={!!settings.stackPlus4OnPlus2}
                            onChange={(v) => onUpdateSettings('stackPlus4OnPlus2', v, (s) => { if (v) s.stackDraw = true; })}
                            disabled={!isHost || !settings.stackDraw}
                         />
                    </SettingItem>

                    <SettingItem
                        label="抽到出为止 (Draw Until Match)"
                        description="无牌可出时，必须一直抽牌直到抽到能出的牌。"
                        checked={!!settings.drawUntilMatch}
                        onChange={(v) => onUpdateSettings('drawUntilMatch', v)}
                        disabled={!isHost}
                    />
                </Section>

                 <Section title="其他规则 ⚙️" color="bg-gray-100">
                    <SettingItem
                        label="禁止质疑 (No Bluffing)"
                        description="打出变色+4牌立即生效，不允许质疑。"
                        checked={!!settings.noBluffing}
                        onChange={(v) => onUpdateSettings('noBluffing', v)}
                        disabled={!isHost}
                    />
                     <SettingItem
                        label="强制出牌 (Force Play)"
                        description="如果你有能出的牌，必须打出，不能保留。"
                        checked={!!settings.forcePlay}
                        onChange={(v) => onUpdateSettings('forcePlay', v)}
                        disabled={!isHost}
                    />
                </Section>
            </div>

            {/* Column 2: Action Rules */}
            <div className="flex flex-col gap-6">
                 <Section title="动作规则 ⚡" color="bg-red-100">
                    <SettingItem
                        label="抢牌 (Jump-In)"
                        description="如果你有完全相同的牌，可以随时抢先打出。"
                        checked={!!settings.jumpIn}
                        onChange={(v) => onUpdateSettings('jumpIn', v, (s) => { if (!v) s.sameColorJumpIn = false; })}
                        disabled={!isHost}
                    >
                        <SubSettingItem
                            label="同色抢牌 (Relaxed Jump-In)"
                            description="只要颜色相同即可抢牌，无需数字完全匹配。"
                            checked={!!settings.sameColorJumpIn}
                            onChange={(v) => onUpdateSettings('sameColorJumpIn', v, (s) => { if (v) s.jumpIn = true; })}
                            disabled={!isHost || !settings.jumpIn}
                        />
                    </SettingItem>

                    <SettingItem
                        label="7-0 换牌规则"
                        description="打出7换手牌，打出0全体轮转手牌。"
                        checked={!!settings.sevenZero}
                        onChange={(v) => onUpdateSettings('sevenZero', v)}
                        disabled={!isHost}
                    />
                </Section>
            </div>
        </div>
    );
}
