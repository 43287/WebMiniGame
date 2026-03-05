
import React from 'react'
import { GameType } from '../types.ts'
import TicTacToeView from './tictactoe/ui/Board.tsx'
import UnoView from './uno/ui/Board.tsx'
import PokerView from './poker/ui/Board.tsx'
import { UnoManual } from './uno/manual.tsx'
import { TicTacToeManual } from './tictactoe/manual.tsx'
import { PokerManual } from './poker/manual.tsx'
import PokerSettings from './poker/ui/Settings.tsx'
import UnoSettings from './uno/ui/Settings.tsx'
import TicTacToeSettings from './tictactoe/ui/Settings.tsx'

export const uiRegistry: Record<GameType, React.ComponentType<any>> = {
	tictactoe: TicTacToeView,
	uno: UnoView,
	poker: PokerView
}

export const manualRegistry: Record<GameType, React.ComponentType<any> | null> = {
    tictactoe: TicTacToeManual,
    uno: UnoManual,
    poker: PokerManual
}

export const settingsRegistry: Record<GameType, React.ComponentType<any> | null> = {
    tictactoe: TicTacToeSettings,
    uno: UnoSettings,
    poker: PokerSettings
}
