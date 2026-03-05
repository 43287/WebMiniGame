
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui';
import { GameState } from '../types';

interface DebugConsoleProps {
    logs: { timestamp: string; type: 'send' | 'receive' | 'info'; content: any }[];
    onSendCommand: (event: string, payload: any) => void;
    gameState: GameState | null;
    gameType: string | undefined;
    currentPlayerId: string;
}

export function DebugConsole({ logs, onSendCommand, gameState, gameType, currentPlayerId }: DebugConsoleProps) {
    const [activeTab, setActiveTab] = useState<'log' | 'send' | 'data'>('log');
    const [selectedEvent, setSelectedEvent] = useState('makeMove');
    const [commandInput, setCommandInput] = useState('{\n  "action": ""\n}');
    const logContainerRef = useRef<HTMLDivElement>(null);

    const EVENT_TYPES = [
        'makeMove',
        'sendChat',
        'updateSettings',
        'startGame',
        'createRoom',
        'joinRoom',
        'leaveRoom',
        'addBot',
        'removeBot',
        'selectGame'
    ];

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, activeTab]);

    // Generate templates based on game type
    const getTemplates = () => {
        // General Templates
        const general = [
             { label: 'Chat', event: 'sendChat', cmd: "Hello World" }
        ];

        let gameSpecific: { label: string, event: string, cmd: any }[] = [];

        if (gameType === 'poker') {
            gameSpecific = [
                { label: 'Bet', event: 'makeMove', cmd: { action: 'bet', amount: 10 } },
                { label: 'Fold', event: 'makeMove', cmd: { action: 'fold' } },
                { label: 'Look', event: 'makeMove', cmd: { action: 'look' } },
                { label: 'Compare', event: 'makeMove', cmd: { action: 'compare', targetId: 'PLAYER_ID' } },
                { label: 'Pass', event: 'makeMove', cmd: { action: 'pass' } },
                { label: 'Play', event: 'makeMove', cmd: { action: 'play', cardIds: [] } },
                { label: 'Bid', event: 'makeMove', cmd: { action: 'bid', score: 1 } }
            ];
        } else if (gameType === 'uno') {
             gameSpecific = [
                { label: 'Play', event: 'makeMove', cmd: { action: 'play', cardIndex: 0 } },
                { label: 'Draw', event: 'makeMove', cmd: { action: 'draw' } },
                { label: 'Color', event: 'makeMove', cmd: { action: 'color', color: 'red' } },
                { label: 'Uno', event: 'makeMove', cmd: { action: 'uno' } },
                { label: 'Challenge', event: 'makeMove', cmd: { action: 'challenge' } }
            ];
        } else if (gameType === 'tictactoe') {
            gameSpecific = [
                { label: 'Move', event: 'makeMove', cmd: { row: 0, col: 0 } }
            ];
        }

        return [...general, ...gameSpecific];
    };

    const handleSend = () => {
        try {
            // For sendChat, payload is string. For others, usually object.
            // We try to parse JSON, if fails but event is sendChat, treat as string.
            let payload;
            try {
                payload = JSON.parse(commandInput);
            } catch (e) {
                if (selectedEvent === 'sendChat' || selectedEvent === 'createRoom' || selectedEvent === 'joinRoom') {
                    payload = commandInput; // Treat as raw string arguments? 
                    // Actually createRoom takes (name, id), joinRoom takes (roomId, name).
                    // This simple console might struggle with multi-arg events unless we define payload as array.
                    // Let's stick to single argument events or object payloads for now.
                    // For sendChat: socket.emit('sendChat', message) -> payload is message string.
                } else {
                    throw e;
                }
            }
            onSendCommand(selectedEvent, payload);
        } catch (e) {
            alert('Invalid JSON (or format for selected event)');
        }
    };

    const applyTemplate = (t: { label: string, event: string, cmd: any }) => {
        setSelectedEvent(t.event);
        setCommandInput(typeof t.cmd === 'string' ? t.cmd : JSON.stringify(t.cmd, null, 2));
    };

    return (
        <div className="flex flex-col h-1/2 border-t-4 border-black bg-gray-100 mt-2 overflow-hidden text-xs font-mono">
            {/* Tabs */}
            <div className="flex border-b-2 border-black bg-gray-200">
                <button 
                    onClick={() => setActiveTab('log')}
                    className={`flex-1 py-1 font-bold ${activeTab === 'log' ? 'bg-white' : 'hover:bg-gray-300'}`}
                >
                    Log
                </button>
                <button 
                    onClick={() => setActiveTab('send')}
                    className={`flex-1 py-1 font-bold ${activeTab === 'send' ? 'bg-white' : 'hover:bg-gray-300'}`}
                >
                    Send
                </button>
                <button 
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 py-1 font-bold ${activeTab === 'data' ? 'bg-white' : 'hover:bg-gray-300'}`}
                >
                    Data
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-white">
                {activeTab === 'log' && (
                    <div ref={logContainerRef} className="absolute inset-0 overflow-y-auto p-2 space-y-1">
                        {logs.length === 0 && <div className="text-gray-400 italic">No logs yet...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="border-b border-gray-100 pb-1">
                                <div className="flex gap-2 text-[10px] text-gray-500">
                                    <span>{log.timestamp}</span>
                                    <span className={`font-bold ${
                                        log.type === 'send' ? 'text-blue-600' : 
                                        log.type === 'receive' ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        [{log.type.toUpperCase()}]
                                    </span>
                                </div>
                                <pre className="whitespace-pre-wrap break-words text-gray-800 mt-0.5">
                                    {typeof log.content === 'string' ? log.content : JSON.stringify(log.content)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'send' && (
                    <div className="absolute inset-0 flex flex-col p-2 gap-2">
                        {/* Event Selector */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Event:</span>
                            <select 
                                value={selectedEvent} 
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="border border-black rounded px-1 py-0.5 bg-white flex-1"
                            >
                                {EVENT_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        {/* Templates */}
                        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                            {getTemplates().map(t => (
                                <button
                                    key={t.label}
                                    onClick={() => applyTemplate(t)}
                                    className="px-2 py-1 bg-gray-200 border border-black rounded hover:bg-gray-300 whitespace-nowrap"
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Payload Input */}
                        <textarea
                            value={commandInput}
                            onChange={e => setCommandInput(e.target.value)}
                            className="flex-1 border-2 border-black p-2 font-mono resize-none text-sm"
                            placeholder="Payload (JSON or String)"
                        />
                        <Button onClick={handleSend} className="py-1">Send Event</Button>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="absolute inset-0 overflow-y-auto p-2">
                        <pre className="text-[10px]">
                            {gameState ? JSON.stringify(gameState, null, 2) : 'No Game State'}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
