import React from 'react';

export function Section({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
    return (
        <div className={`border-4 border-black p-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white relative overflow-hidden group hover:scale-[1.01] transition-transform`}>
             <div className={`${color} border-b-4 border-black p-3 flex items-center justify-between`}>
                <h3 className="font-black text-xl">{title}</h3>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full border-2 border-black bg-white"></div>
                    <div className="w-3 h-3 rounded-full border-2 border-black bg-white"></div>
                </div>
            </div>
            <div className="p-4 flex flex-col gap-4">
                {children}
            </div>
        </div>
    );
}

export function SettingItem({ label, description, checked, onChange, disabled, children }: { 
    label: string, 
    description?: string, 
    checked: boolean, 
    onChange: (checked: boolean) => void, 
    disabled: boolean,
    children?: React.ReactNode 
}) {
    return (
        <div className="flex flex-col">
            <div 
                onClick={() => !disabled && onChange(!checked)}
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`}
            >
                {/* Custom Checkbox */}
                <div className={`w-7 h-7 mt-1 border-3 border-black flex-shrink-0 flex items-center justify-center transition-colors relative ${checked ? 'bg-black' : 'bg-white'}`}>
                     {checked && (
                         <span className="text-white font-bold text-lg absolute -top-1 left-0.5">✓</span>
                     )}
                </div>
                
                <div className="flex-1">
                    <div className={`font-bold text-lg leading-tight ${checked ? 'text-black' : 'text-gray-600'}`}>{label}</div>
                    {description && <div className="text-xs text-gray-500 font-medium mt-1 leading-snug">{description}</div>}
                </div>
            </div>
            
            {/* Children (Sub-settings) */}
            {children && (
                <div className="ml-5 pl-4 border-l-4 border-dashed border-gray-300 mt-2 flex flex-col gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SubSettingItem({ label, description, checked, onChange, disabled }: { 
    label: string, 
    description: string, 
    checked: boolean, 
    onChange: (checked: boolean) => void, 
    disabled: boolean 
}) {
    return (
        <div 
            onClick={() => !disabled && onChange(!checked)}
            className={`flex items-start gap-2 p-2 rounded transition-colors select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
        >
             {/* Smaller Checkbox */}
             <div className={`w-5 h-5 mt-0.5 border-2 border-black flex-shrink-0 flex items-center justify-center transition-colors relative ${checked ? 'bg-black' : 'bg-white'}`}>
                 {checked && (
                     <span className="text-white font-bold text-xs absolute top-0 left-0.5">✓</span>
                 )}
            </div>
            <div className="flex-1">
                <div className={`font-bold text-sm leading-tight ${checked ? 'text-black' : 'text-gray-600'}`}>{label}</div>
                <div className="text-[10px] text-gray-400 font-medium leading-tight">{description}</div>
            </div>
        </div>
    );
}

export function NumberSettingItem({ label, value, min, max, onChange, disabled }: {
    label: string,
    value: number,
    min?: number,
    max?: number,
    onChange: (value: number) => void,
    disabled: boolean
}) {
    return (
        <div className={`flex items-center justify-between p-2 rounded-lg transition-colors select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
            <div className="font-bold text-lg leading-tight text-black">{label}</div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        if (disabled) return;
                        // Dynamic step: 100 for chips (usually > 100), 1 for others
                        const step = value >= 100 ? 100 : 1;
                        if (min !== undefined && value - step < min) {
                            onChange(min);
                        } else {
                            onChange(value - step);
                        }
                    }}
                    disabled={disabled || (min !== undefined && value <= min)}
                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 font-bold"
                >
                    -
                </button>
                <div className="font-black text-xl min-w-[3ch] text-center">{value}</div>
                <button
                     onClick={() => {
                        if (disabled) return;
                        const step = value >= 100 ? 100 : 1;
                        if (max !== undefined && value + step > max) {
                            onChange(max);
                        } else {
                            onChange(value + step);
                        }
                    }}
                    disabled={disabled || (max !== undefined && value >= max)}
                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 font-bold"
                >
                    +
                </button>
            </div>
        </div>
    );
}
