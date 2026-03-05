import { Card, CardColor, CardType } from './types.ts';

export function shuffle(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function createDeck(): Card[] {
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    let deck: Card[] = [];
    let idCounter = 0;

    colors.forEach((color) => {
      // 0 card (one per color)
      deck.push({ id: `c-${idCounter++}`, color, type: 'number', value: 0 });
      // 1-9 cards (two per color)
      for (let i = 1; i <= 9; i++) {
        deck.push({ id: `c-${idCounter++}`, color, type: 'number', value: i });
        deck.push({ id: `c-${idCounter++}`, color, type: 'number', value: i });
      }
      // Action cards (two per color)
      ['skip', 'reverse', 'draw2'].forEach((type) => {
        deck.push({ id: `c-${idCounter++}`, color, type: type as CardType });
        deck.push({ id: `c-${idCounter++}`, color, type: type as CardType });
      });
    });

    // Wild cards (four each)
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `c-${idCounter++}`, color: 'black', type: 'wild' });
      deck.push({ id: `c-${idCounter++}`, color: 'black', type: 'wild_draw4' });
    }

    return shuffle(deck);
}

export function isCardPlayable(card: Card, topCard: Card, currentColor: CardColor): boolean {
    if (card.color === 'black') return true;
    if (card.color === currentColor) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type !== 'number' && card.type === topCard.type) return true;
    return false;
}

export function getNextPlayerIndex(numPlayers: number, currentIndex: number, direction: 1 | -1): number {
    return (currentIndex + direction + numPlayers) % numPlayers;
}
