
export interface BaseCard {
    id: string;
    type: string;
    value?: number | string;
    // Add other common properties if needed
    // But usually games have very different card structures (color vs suit)
    // So this might just be a marker interface for now
}

export interface BasePlayer {
    id: string;
    name: string;
    avatar?: string;
    isReady?: boolean;
    isBot?: boolean;
}
