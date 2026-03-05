import React from 'react';
import manualMd from './manual.md?raw';
import { MarkdownViewer } from '../../components/MarkdownViewer';

export function UnoManual() {
    return <MarkdownViewer content={manualMd} />;
}
