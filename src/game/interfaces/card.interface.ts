export type CardRank = 'J' | 'Q' | 'K' | 'A' | 'JOKER';

export interface Card {
  id: string;
  rank: CardRank;
}