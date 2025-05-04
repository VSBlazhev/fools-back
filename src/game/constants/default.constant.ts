import { Card } from '../interfaces/card.interface';

export const DEFAULT_DECK: Card[] = [
  // 6 Королей
  { id: 'K-1', rank: 'K' },
  { id: 'K-2', rank: 'K' },
  { id: 'K-3', rank: 'K' },
  { id: 'K-4', rank: 'K' },
  { id: 'K-5', rank: 'K' },
  { id: 'K-6', rank: 'K' },

  // 6 Дам
  { id: 'Q-1', rank: 'Q' },
  { id: 'Q-2', rank: 'Q' },
  { id: 'Q-3', rank: 'Q' },
  { id: 'Q-4', rank: 'Q' },
  { id: 'Q-5', rank: 'Q' },
  { id: 'Q-6', rank: 'Q' },

  // 6 Валетов
  { id: 'J-1', rank: 'J' },
  { id: 'J-2', rank: 'J' },
  { id: 'J-3', rank: 'J' },
  { id: 'J-4', rank: 'J' },
  { id: 'J-5', rank: 'J' },
  { id: 'J-6', rank: 'J' },

  // 6 Тузов
  { id: 'A-1', rank: 'A' },
  { id: 'A-2', rank: 'A' },
  { id: 'A-3', rank: 'A' },
  { id: 'A-4', rank: 'A' },
  { id: 'A-5', rank: 'A' },
  { id: 'A-6', rank: 'A' },

  // 4 Джокера
  { id: 'JOKER-1', rank: 'JOKER' },
  { id: 'JOKER-2', rank: 'JOKER' },
  { id: 'JOKER-3', rank: 'JOKER' },
  { id: 'JOKER-4', rank: 'JOKER' },
];

export const DEFAULT_CHAMBER: boolean[] = [
  false,
  false,
  false,
  false,
  false,
  false,
];

export const DEFAULT_TEST_CHAMBER: boolean[] = [
  true,
  true,
  true,
  true,
  true,
  true,
];
