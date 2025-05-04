import { Card } from './card.interface';

export interface Player {
  id: string;
  name?: string;
  hand: Card[];
  chamber: boolean[];
}
