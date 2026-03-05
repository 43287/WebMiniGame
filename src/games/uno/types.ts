export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'black';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

export type Card = {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
};

export type UnoSettings = {
  stackDraw?: boolean; // 叠加摸牌
  sevenZero?: boolean; // 7-0规则
  forcePlay?: boolean; // 强制出牌
  drawUntilMatch?: boolean; // 抓到为止
  jumpIn?: boolean; // 抢牌
  sameColorJumpIn?: boolean; // 同色抢牌
  noBluffing?: boolean; // 禁止质疑 (不虚张声势)
  stackPlus4OnPlus2?: boolean; // 允许+4叠加在+2上
};

export type ChallengeState = {
    active: boolean;
    challengerId: string; // The intended victim (next player) who will draw 4 if no one challenges
    suspectId: string;    // The player who played Wild Draw 4
    drawAmount: number;
    prevColor: CardColor; // The color BEFORE the Wild Draw 4 was played
    declinedPlayerIds: string[]; // List of players who have declined to challenge
};

export type UnoData = {
  deck: Card[];
  discardPile: Card[];
  hands: { [playerId: string]: Card[] };
  direction: 1 | -1;
  currentColor: CardColor;
  settings: UnoSettings;
  pendingDraw?: number; // Amount of cards pending to be drawn (from stack)
  
  // New fields for robust rules
  unoShouted: { [playerId: string]: boolean }; // Track who shouted UNO
  lastOneCardTime: { [playerId: string]: number }; // Timestamp when player reached 1 card (to allow grace period or verify order) - simplified to boolean check
  challengeState: ChallengeState | null;
  hasDrawnThisTurn: boolean; // Track if current player has drawn a card this turn
};
