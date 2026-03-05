import { GameState } from '../../types.ts';
import { UnoData, CardColor } from './types.ts';
import { isCardPlayable } from './utils.ts';

export function getBotMove(state: GameState, botId: string): any | null {
    const data = state.gameData as UnoData;
    const hand = data.hands[botId];
    
    // 0. Catch UNO Failure (Priority)
    // Check if any opponent has 1 card and hasn't shouted UNO
    for (const playerId in data.hands) {
        if (playerId !== botId) {
            if (data.hands[playerId].length === 1 && !data.unoShouted[playerId]) {
                // Found someone to catch!
                return { action: 'catchUnoFailure', targetId: playerId };
            }
        }
    }
    
    // 1. Shout UNO if needed
    if (hand.length === 2 && !data.unoShouted[botId]) {
        // Bot shouts before playing? Or logic handles it.
        // We'll let bot shout as a separate move if we want, but easier to assume bot never forgets.
        // But for "Make Move", we need to return an action.
        // Let's assume bot automatically gets marked as shouted in a real implementation, 
        // or we return a 'shoutUno' action first.
        if (Math.random() > 0.1) { // 90% chance to remember
             return { action: 'shoutUno' };
        }
    }
    
    // 2. Challenge?
    if (data.challengeState && data.challengeState.active) {
        if (data.challengeState.challengerId === botId) {
            // Bot logic for challenging
            // Simple: Challenge 50% of time? Or if they have a playable card?
            return { action: 'declineChallenge' }; // Safe bot
        } else {
             return null; // Not my turn to act
        }
    }

    const topCard = data.discardPile[data.discardPile.length - 1];
    const currentColor = data.currentColor;
    
    // 3. Stack Draw
    if (data.pendingDraw && data.pendingDraw > 0 && data.settings.stackDraw) {
        const stackable = hand.find(c => {
            // Same type stacking
            if ((c.type === 'draw2' && topCard.type === 'draw2') || 
                (c.type === 'wild_draw4' && topCard.type === 'wild_draw4')) {
                return true;
            }
            // Cross type stacking (+4 on +2)
            if (data.settings.stackPlus4OnPlus2 && 
                c.type === 'wild_draw4' && topCard.type === 'draw2') {
                return true;
            }
            return false;
        });
        
        if (stackable) {
            // If playing a Wild Draw 4, need to choose a color
            let chosenColor: CardColor = 'red';
            if (stackable.color === 'black') {
                const colorCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
                hand.forEach(c => {
                    if (c.color !== 'black') colorCounts[c.color]++;
                });
                chosenColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b) as CardColor;
            }
            return { action: 'play', cardId: stackable.id, chosenColor };
        } else {
            return { action: 'draw' };
        }
    }

    // 4. Normal Play
    const validMoves = hand.filter(card => isCardPlayable(card, topCard, currentColor));

    if (validMoves.length > 0) {
      const card = validMoves[Math.floor(Math.random() * validMoves.length)];
      let chosenColor: CardColor | undefined;
      let targetPlayerId: string | undefined;
      
      if (card.color === 'black') {
        const colorCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(c => {
            if (c.color !== 'black') colorCounts[c.color]++;
        });
        chosenColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b) as CardColor;
      }
      
      if (data.settings.sevenZero && card.value === 7) {
          const opponents = state.players.filter(p => p.id !== botId);
          targetPlayerId = opponents[Math.floor(Math.random() * opponents.length)].id;
      }

      return { action: 'play', cardId: card.id, chosenColor, targetPlayerId };
    } else {
      return { action: 'draw' };
    }
}
