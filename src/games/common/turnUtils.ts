
/**
 * Calculates the next player index in a circular manner.
 * @param numPlayers Total number of players.
 * @param currentIndex Current player's index.
 * @param direction 1 for clockwise, -1 for counter-clockwise.
 * @returns The index of the next player.
 */
export function getNextPlayerIndex(numPlayers: number, currentIndex: number, direction: 1 | -1 = 1): number {
    return (currentIndex + direction + numPlayers) % numPlayers;
}

/**
 * Manages turn logic, including skips and reversals.
 */
export class TurnManager {
    constructor(
        private numPlayers: number,
        private currentPlayerIndex: number = 0,
        private direction: 1 | -1 = 1
    ) {}

    getCurrentIndex(): number {
        return this.currentPlayerIndex;
    }

    getDirection(): 1 | -1 {
        return this.direction;
    }

    /**
     * Advances to the next player.
     * @param steps How many steps to advance (1 = normal, 2 = skip one player).
     */
    advance(steps: number = 1): void {
        this.currentPlayerIndex = (this.currentPlayerIndex + (steps * this.direction) + this.numPlayers) % this.numPlayers;
    }

    /**
     * Reverses the direction of play.
     */
    reverse(): void {
        this.direction = (this.direction * -1) as 1 | -1;
        // In 2-player game, reverse usually acts like skip, but that logic is often game-specific.
        // We leave game-specific interpretation to the caller.
    }
    
    /**
     * Sets the current player explicitly (e.g., after a challenge or jump-in).
     */
    setPlayer(index: number): void {
        this.currentPlayerIndex = index;
    }
}
