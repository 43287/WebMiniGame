import { GameType } from '../types.ts'
import { GameLogic } from './GameInterface.ts'
import tttLogic from './tictactoe/logic.ts'
import unoLogic from './uno/logic.ts'
import pokerLogic from './poker/logic.ts'

export const logicRegistry: Record<GameType, GameLogic> = {
	tictactoe: tttLogic,
	uno: unoLogic,
	poker: pokerLogic
}
