import { produce, setAutoFreeze } from 'immer';

// Disable auto-freezing to allow server.ts to modify shared objects (like Player.chatMessage)
setAutoFreeze(false);

import { GameLogic } from '../GameInterface.ts';
import { GameState, Player } from '../../types.ts';
import { UnoData, UnoSettings, Card, CardColor, CardType, ChallengeState } from './types.ts';
import { createDeck, shuffle, isCardPlayable, getNextPlayerIndex } from './utils.ts';
import { getBotMove } from './ai.ts';

export class Uno implements GameLogic {
  minPlayers = 2;
  maxPlayers = 10;
  
  init(players: Player[], settings?: UnoSettings): GameState {
    const deck: Card[] = createDeck();
    const hands: { [playerId: string]: Card[] } = {};

    // Deal 7 cards to each player
    players.forEach((player) => {
      hands[player.id] = deck.splice(0, 7);
    });

    let firstCard = deck.pop()!;
    while (firstCard.type === 'wild_draw4') {
        deck.unshift(firstCard);
        // shuffle is imported
        shuffle(deck);
        firstCard = deck.pop()!;
    }

    const data: UnoData = {
        deck,
        discardPile: [firstCard],
        hands,
        direction: 1,
        currentColor: firstCard.color === 'black' ? 'red' : firstCard.color, // Default to red if Wild, will be updated below
        settings: settings || {},
        pendingDraw: 0,
        unoShouted: {},
        lastOneCardTime: {},
        challengeState: null,
        hasDrawnThisTurn: false,
    };

    let currentTurn = players[0].id;
    let nextPlayerIndex = 0;

    // Handle First Card Special Rules
    let startIndex = 1 % players.length; // Default next to dealer
    
    if (firstCard.type === 'wild') {
        data.currentColor = 'red'; 
    } else if (firstCard.type === 'reverse') {
        data.direction = -1;
        if (players.length === 2) {
             startIndex = 0;
        } else {
             startIndex = players.length - 1;
        }
    } else if (firstCard.type === 'skip') {
        startIndex = 2 % players.length;
    } else if (firstCard.type === 'draw2') {
        this.drawCardsRaw(data, players[1].id, 2);
        startIndex = 2 % players.length;
    } else {
        startIndex = 1 % players.length;
    }
    
    return {
      id: '',
      type: 'uno',
      players: players,
      status: 'playing',
      winner: null,
      currentTurn: players[startIndex].id,
      gameData: data,
    };
  }

  makeMove(state: GameState, playerId: string, move: any): GameState {
    if (state.status !== 'playing') return state;
    
    return produce(state, (draft) => {
        const data = draft.gameData as UnoData;
        
        // --- Special Actions (Challenge, Shout UNO, Catch Failure) ---
        
        // 1. Shout UNO
        if (move.action === 'shoutUno') {
            if (data.hands[playerId].length <= 2) {
                data.unoShouted[playerId] = true;
                return;
            }
            this.drawCardsRaw(data, playerId, 2);
            return;
        }
        
        // 2. Catch Failure (Report someone who didn't shout UNO)
        if (move.action === 'catchUnoFailure') {
            const targetId = move.targetId;
            if (!targetId || targetId === playerId) return;
            
            if (data.hands[targetId].length === 1 && !data.unoShouted[targetId]) {
                this.drawCardsRaw(data, targetId, 2);
                data.unoShouted[targetId] = true; 
            } else {
                this.drawCardsRaw(data, playerId, 2);
            }
            return;
        }
        
        // 3. Challenge Wild Draw 4
        if (data.challengeState && data.challengeState.active) {
            // Only suspect cannot interact
            if (playerId === data.challengeState.suspectId) {
                 return;
            }
            
            if (move.action === 'challenge') {
                // Only the designated challenger (victim) can challenge
                if (playerId !== data.challengeState.challengerId) {
                    return;
                }

                const suspectId = data.challengeState.suspectId;
                const victimId = data.challengeState.challengerId; // The intended victim
                const suspectHand = data.hands[suspectId];
                
                if (!suspectHand) return;

                // Check if suspect had a matching card for the PREVIOUS color
                const prevColor = data.challengeState.prevColor;
                
                 const hasMatch = suspectHand.some(c => c.color === prevColor);
                 
                 if (hasMatch) {
                     // Success: Suspect draws 4
                     this.drawCardsRaw(data, suspectId, data.challengeState.drawAmount);
                     
                     // Since challenge succeeded, the +4 was invalid.
                     // The victim (next player) does NOT draw and gets to play their turn.
                     draft.gameData.hasDrawnThisTurn = false;
                     draft.currentTurn = victimId;
                 } else {
                     // Failed: Challenger draws 6 (4 + 2 penalty)
                     this.drawCardsRaw(data, playerId, data.challengeState.drawAmount + 2);
                     
                     // Since challenge failed, the +4 was valid.
                     // The victim loses their turn (standard +4 behavior).
                     // Play proceeds to the player AFTER the victim.
                     const victimIndex = state.players.findIndex(p => p.id === victimId);
                     const nextPlayerIndex = getNextPlayerIndex(state.players.length, victimIndex, data.direction);
                     draft.gameData.hasDrawnThisTurn = false;
                     draft.currentTurn = state.players[nextPlayerIndex].id;
                 }
                 
                 data.pendingDraw = 0;
                 data.challengeState = null;
                 return;

            } else if (move.action === 'declineChallenge') {
                // Only the designated challenger (victim) can decline
                if (playerId !== data.challengeState.challengerId) {
                    return;
                }

                // Victim accepts the +4
                const victimId = data.challengeState.challengerId;
                
                // Victim draws 4
                this.drawCardsRaw(data, victimId, data.challengeState.drawAmount);
                data.pendingDraw = 0;
                
                // Victim loses turn
                const victimIndex = state.players.findIndex(p => p.id === victimId);
                const nextPlayerIndex = getNextPlayerIndex(state.players.length, victimIndex, data.direction);
                draft.gameData.hasDrawnThisTurn = false;
                draft.currentTurn = state.players[nextPlayerIndex].id;
                
                data.challengeState = null;
                return;
            }
            return; 
        }

        // --- Standard Moves ---

        // Check Jump-In (Cut)
        if (!data.challengeState && data.settings.jumpIn && move.action === 'play' && move.cardId) {
            const hand = data.hands[playerId];
            const card = hand.find(c => c.id === move.cardId);
            const topCard = data.discardPile[data.discardPile.length - 1];
            
            if (card && topCard) {
                let isJumpInValid = false;
                if (data.settings.sameColorJumpIn) {
                    isJumpInValid = card.color === topCard.color;
                } else {
                    isJumpInValid = card.color === topCard.color && 
                                         ((card.type === 'number' && card.value === topCard.value) || 
                                          (card.type !== 'number' && card.type === topCard.type));
                }
                
                if (isJumpInValid) {
                    draft.currentTurn = playerId;
                    draft.gameData.hasDrawnThisTurn = false;
                }
            }
        }

        if (draft.currentTurn !== playerId) return;

        let nextPlayerIndex = state.players.findIndex((p) => p.id === playerId);

        // Keep
        if (move.action === 'keep') {
            // Can only skip if player has drawn a card this turn
            if (!data.hasDrawnThisTurn) return;

            // If drawUntilMatch is ON, skipping is NOT allowed. Player MUST play.
            if (data.settings.drawUntilMatch) return;

            Object.keys(data.hands).forEach(pId => {
                if (pId !== playerId && data.hands[pId].length === 1) {
                    data.unoShouted[pId] = true;
                }
            });
            
            // Reset draw flag for next player
            draft.gameData.hasDrawnThisTurn = false;
            
            nextPlayerIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);
            draft.currentTurn = state.players[nextPlayerIndex].id;
            return;
        }

        // Draw
        if (move.action === 'draw') {
          if (draft.gameData.pendingDraw && draft.gameData.pendingDraw > 0) {
              this.drawCardsRaw(draft.gameData, playerId, draft.gameData.pendingDraw);
              draft.gameData.pendingDraw = 0;
              draft.gameData.hasDrawnThisTurn = false; // Reset for next player
              nextPlayerIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);
              draft.currentTurn = state.players[nextPlayerIndex].id;
              return;
          }

          // Prevent multiple draws in one turn if NOT drawUntilMatch
          if (data.hasDrawnThisTurn && !data.settings.drawUntilMatch) return;

          // Draw one card
          if (draft.gameData.deck.length === 0 && draft.gameData.discardPile.length <= 1) {
              // Cannot draw
          } else {
              const drawnCard = this.drawOne(draft.gameData, playerId);
              
              if (drawnCard && isCardPlayable(drawnCard, draft.gameData.discardPile[draft.gameData.discardPile.length - 1], draft.gameData.currentColor)) {
                  // Player drew a playable card.
                  draft.gameData.hasDrawnThisTurn = true;
                  return; 
              }
              
              // Card not playable.
              if (data.settings.drawUntilMatch) {
                   if (draft.gameData.deck.length === 0 && draft.gameData.discardPile.length <= 1) {
                       // Fall through to end turn
                   } else {
                       return;
                   }
              }
          }
          
          // Standard Rule: Drawn card not playable, turn ends.
          Object.keys(data.hands).forEach(pId => {
              if (pId !== playerId && data.hands[pId].length === 1) {
                  data.unoShouted[pId] = true;
              }
          });
          draft.gameData.hasDrawnThisTurn = false; // Reset for next player
          nextPlayerIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);
          draft.currentTurn = state.players[nextPlayerIndex].id;
          return;
        }

        // Play
        if (move.action === 'play' && move.cardId) {
          const hand = draft.gameData.hands[playerId];
          const cardIndex = hand.findIndex((c) => c.id === move.cardId);
          if (cardIndex === -1) return;

          const card = hand[cardIndex];
          const topCard = draft.gameData.discardPile[draft.gameData.discardPile.length - 1];

          // Validate
          if (draft.gameData.pendingDraw && draft.gameData.pendingDraw > 0) {
              if (!data.settings.stackDraw) return; 
              
              let isStackable = false;
              // 1. Same type stacking (+2 on +2, +4 on +4)
              if ((card.type === 'draw2' && topCard.type === 'draw2') || 
                  (card.type === 'wild_draw4' && topCard.type === 'wild_draw4')) {
                  isStackable = true;
              }
              // 2. Cross type stacking (+4 on +2) if enabled
              else if (data.settings.stackPlus4OnPlus2 && 
                       card.type === 'wild_draw4' && topCard.type === 'draw2') {
                  isStackable = true;
              }
              
              if (!isStackable) return;
          } else {
              const isColorMatch = card.color === draft.gameData.currentColor;
              const isValueMatch = card.type === 'number' && topCard.type === 'number' && card.value === topCard.value;
              const isTypeMatch = card.type !== 'number' && card.type === topCard.type;
              const isWild = card.color === 'black';

              if (!isColorMatch && !isValueMatch && !isTypeMatch && !isWild) {
                return;
              }
          }
          
          const colorBeforePlay = data.currentColor;

          draft.gameData.hands[playerId].splice(cardIndex, 1);
          draft.gameData.discardPile.push(card);
          
          if (draft.gameData.hands[playerId].length !== 1) {
              draft.gameData.unoShouted[playerId] = false;
          }
          
          if (card.color === 'black') {
             draft.gameData.currentColor = move.chosenColor || 'red';
          } else {
             draft.gameData.currentColor = card.color;
          }

          let nextPIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);

          if (card.type === 'reverse') {
            draft.gameData.direction = (draft.gameData.direction * -1) as 1 | -1;
            if (state.players.length === 2) {
               nextPIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);
            } else {
               nextPIndex = getNextPlayerIndex(state.players.length, nextPlayerIndex, draft.gameData.direction);
            }
          } else if (card.type === 'skip') {
            nextPIndex = getNextPlayerIndex(state.players.length, nextPIndex, draft.gameData.direction);
          } else if (card.type === 'draw2') {
            if (data.settings.stackDraw) {
                draft.gameData.pendingDraw = (draft.gameData.pendingDraw || 0) + 2;
            } else {
                this.drawCardsRaw(draft.gameData, state.players[nextPIndex].id, 2);
                // After drawing 2, the player loses their turn.
                nextPIndex = getNextPlayerIndex(state.players.length, nextPIndex, draft.gameData.direction);
            }
          } else if (card.type === 'wild_draw4') {
            const drawAmount = (draft.gameData.pendingDraw || 0) + 4;
            
            if (data.settings.stackDraw) {
                 draft.gameData.pendingDraw = drawAmount;
            } else {
                 draft.gameData.pendingDraw = 4;
            }

            if (!data.settings.noBluffing) {
                draft.gameData.challengeState = {
                    active: true,
                    challengerId: state.players[nextPIndex].id,
                    suspectId: playerId,
                    drawAmount: draft.gameData.pendingDraw || 4,
                    prevColor: colorBeforePlay,
                    declinedPlayerIds: []
                };
                
                draft.gameData.hasDrawnThisTurn = false;
                draft.currentTurn = state.players[nextPIndex].id; 
                return;
            } else {
                 const victimId = state.players[nextPIndex].id;
                 this.drawCardsRaw(draft.gameData, victimId, draft.gameData.pendingDraw || 4);
                 draft.gameData.pendingDraw = 0;
                 nextPIndex = getNextPlayerIndex(state.players.length, nextPIndex, draft.gameData.direction);
            }
          } else if (data.settings.sevenZero && card.type === 'number') {
              if (card.value === 0) {
                  this.handleZero(draft, state.players);
              } else if (card.value === 7 && move.targetPlayerId) {
                  this.handleSeven(draft, playerId, move.targetPlayerId);
              }
          }

          if (draft.gameData.hands[playerId].length === 0) {
            draft.status = 'finished';
            draft.winner = playerId;
            return;
          }

          Object.keys(data.hands).forEach(pId => {
              if (pId !== playerId && data.hands[pId].length === 1) {
                  draft.gameData.unoShouted[pId] = true;
              }
          });

          draft.gameData.hasDrawnThisTurn = false;
          draft.currentTurn = state.players[nextPIndex].id;
        }
    });
  }
  
  private drawOne(data: UnoData, playerId: string): Card | null {
    if (data.deck.length === 0) {
      if (data.discardPile.length <= 1) {
         // Deck empty and discard pile only has top card (or empty), cannot reshuffle
         return null;
      }
      // Keep the top card
      const top = data.discardPile.pop();
      if (!top) return null; // Should not happen given length check but safe guard

      // Shuffle rest
      const newDeck = shuffle([...data.discardPile]); // Create copy to shuffle
      data.deck = newDeck;
      
      // Reset discard pile with just the top card
      data.discardPile = [top];
    }
    
    if (data.deck.length > 0) {
      const c = data.deck.pop();
      if (c) {
        if (!data.hands[playerId]) {
           data.hands[playerId] = [];
        }
        data.hands[playerId].push(c);
        return c;
      }
    }
    return null;
  }

  private drawCardsRaw(data: UnoData, playerId: string, count: number) {
    for (let i = 0; i < count; i++) {
        this.drawOne(data, playerId);
    }
  }
  
  private handleZero(state: GameState, players: Player[]) {
      const data = state.gameData as UnoData;
      const playerIds = players.map(p => p.id);
      const currentHands = playerIds.map(id => data.hands[id]);
      
      if (data.direction === 1) {
          const lastHand = currentHands.pop()!;
          currentHands.unshift(lastHand);
      } else {
          const firstHand = currentHands.shift()!;
          currentHands.push(firstHand);
      }
      
      playerIds.forEach((id, index) => {
          data.hands[id] = currentHands[index];
      });
  }
  
  private handleSeven(state: GameState, playerId: string, targetId: string) {
      const data = state.gameData as UnoData;
      const myHand = data.hands[playerId];
      const targetHand = data.hands[targetId];
      if (targetHand) {
          data.hands[playerId] = targetHand;
          data.hands[targetId] = myHand;
      }
  }

  checkWin(state: GameState): { winner: string | null; status: 'playing' | 'finished' } {
    const data = state.gameData as UnoData;
    for (const player of state.players) {
      if (data.hands[player.id].length === 0) {
        return { winner: player.id, status: 'finished' };
      }
    }
    return { winner: null, status: 'playing' };
  }

  getBotMove(state: GameState, botId: string): any | null {
    return getBotMove(state, botId);
  }

  maskState(state: GameState, playerId: string): GameState {
    return produce(state, (draft) => {
        const data = draft.gameData as UnoData;
        
        // Hide deck
        data.deck = [];
        
        // Hide opponents' hands
        Object.keys(data.hands).forEach(pId => {
            if (pId !== playerId) {
                // Replace cards with dummy objects (preserving length)
                data.hands[pId] = data.hands[pId].map((_, i) => ({
                    id: `unknown-${i}`,
                    color: 'black',
                    type: 'wild' as any, // Dummy type
                    value: 0
                }));
            }
        });
    });
  }
}

const logic = new Uno();
export default logic;
