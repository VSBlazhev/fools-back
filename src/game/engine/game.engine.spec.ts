import { GameEngine } from './game.engine';

describe('GameEngine', () => {
  const room = 'roomID';

  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];

  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(room);

    engine.initPlayers(players);
  });

  it('should be able to create a game', () => {
    expect(engine.deck.length).toBe(28);
  });

  it('should initialize with 2 players', () => {
    expect(engine.players.length).toBe(2);
  });

  it('should deal 5 cards to each player', () => {
    for (const player of engine.players) {
      expect(player.hand.length).toBe(5);
    }
  });

  it('should have a kon card selected', () => {
    expect(['J', 'Q', 'K', 'A']).toContain(engine.konCard);
  });

  it('should allow player to play cards', () => {
    const player = engine.players[0];
    const cardIds = [player.hand[0]];
    engine.playCards(player.id, cardIds);
    expect(player.hand.length).toBe(4);
    expect(engine.tableCards.length).toBe(1);
  });

  it('should switch turn correctly', () => {
    const current = engine.getCurrentPlayerId();
    engine.nextTurn();
    const next = engine.getCurrentPlayerId();
    expect(next).not.toBe(current);
  });

  it('should return game over when all hands are empty', () => {
    for (const player of engine.players) {
      player.hand = [];
    }
    expect(engine.isGameOver()).toBe(true);
  });

  it('should always consider JOKER as matching konCard', () => {
    engine.konCard = 'Q';
    engine.tableCards = [{ id: 'joker-1', rank: 'JOKER' }];
    expect(engine.verifyLastPlayedCards(true)).toBe(true);
    expect(engine.verifyLastPlayedCards(false)).toBe(false);
  });
});
