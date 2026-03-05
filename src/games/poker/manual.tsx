import React from 'react';
import manualMd from './manual.md?raw';
import { MarkdownViewer } from '../../components/MarkdownViewer';

export function PokerManual() {
    return <MarkdownViewer content={manualMd} />;
}
