import { Player } from '../interfaces/player.interface';
import { Card, CardRank } from '../interfaces/card.interface';
import {
  DEFAULT_CHAMBER,
  DEFAULT_DECK,
  DEFAULT_TEST_CHAMBER,
} from '../constants/default.constant';

export class GameEngine {
  players: Player[] = [];
  deck: Card[] = [];
  tableCards: Card[] = [];
  currentPlayerIndex: number = 0;
  private maxPlayers = 4;

  konCard: CardRank;
  //new stuff
  gameOver: boolean = false;
  previousPlayer: string;
  isAllActions: boolean = true;

  constructor(private roomId: string) {}

  public initPlayers(users: string[]) {
    if (users.length > this.maxPlayers) {
      throw new Error('Too many players');
    }

    this.players = users.map((user) => ({
      id: user,
      hand: [],
      chamber: [...DEFAULT_CHAMBER],
      // chamber: [...DEFAULT_CHAMBER],
    }));

    this.players.forEach((player: Player) => {
      this.loadBullet(player.id);
      // this.shuffleChamber(player.id);
    });

    this.deck = [...DEFAULT_DECK];

    this.shuffleDeck();

    this.dealCards();
    this.chooseKonCard();
    this.chooseFirstPlayer();
  }

  public loadBullet(id: string) {
    const player = this.players.find((player) => player.id === id);
    if (!player) {
      throw new Error('No player');
    }
    const bulletPosition = Math.floor(Math.random() * 6);
    player.chamber[bulletPosition] = true;
  }

  // public shuffleChamber(id: string) {
  //   const player = this.players.find((player) => player.id === id);
  //   if (!player) {
  //     throw new Error('No player');
  //   }
  //   player.chamber = player.chamber.sort(() => Math.random() - 0.5);
  // }

  public pullTrigger(id: string) {
    const player = this.players.find((player) => player.id === id);
    if (!player) {
      throw new Error('No player');
    }
    const fired = player.chamber.pop();
    console.log('Pukk triger engine', {
      chamber: player.chamber,
      fired: fired,
    });
    if (fired) {
      this.players = this.players.filter((player) => player.id !== id);
      console.log('Players length before IF statement', this.players.length);
      if (this.players.length === 1) {
        console.log('Players length', this.players.length);
        this.gameOver = true;
        return false; // игра окончена
      }
      this.isAllActions = true;
      this.nextPlayer();
      this.newRound();
      return false;
    } else {
      this.isAllActions = true;
      this.nextPlayer();
      this.newRound();
    }

    return true; // продолжаем игру
  }

  public newRound() {
    this.players = this.players.map((user) => ({ ...user, hand: [] }));

    this.tableCards = [];
    this.isAllActions = true;
    this.deck = [...DEFAULT_DECK];

    this.shuffleDeck();

    this.dealCards();
    this.chooseKonCard();
    this.chooseFirstPlayer();
  }

  public shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public toggleActions() {
    this.isAllActions = !this.isAllActions;
  }

  public dealCards() {
    for (let i = 0; i < 5; i++) {
      for (const player of this.players) {
        const card = this.deck.pop();
        if (card) player.hand.push(card);
      }
    }
  }

  public chooseKonCard() {
    const konRanks: CardRank[] = ['J', 'Q', 'K', 'A'];
    const randomIndex = Math.floor(Math.random() * konRanks.length);
    this.konCard = konRanks[randomIndex];
  }

  public chooseFirstPlayer() {
    this.currentPlayerIndex = Math.floor(Math.random() * this.players.length);
  }

  public getState() {
    return {
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        cardsInHand: p.hand.length,
      })),
      konCard: this.konCard,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id,
      tableCards: this.tableCards,
      isAllActions: this.isAllActions,
      previousPlayer: this.previousPlayer,
    };
  }

  public sendHand(id: string) {
    const player = this.players.find((p) => p.id === id);
    if (!player) {
      throw new Error('Unknown player');
    }

    return player.hand;
  }

  public playCards(playerId: string, cards: Card[]) {
    const player = this.players.find((p) => p.id === playerId);
    const currentPlayer = this.getCurrentPlayerId();
    if (!player) {
      throw new Error('Player not found');
    }
    if (player.id !== currentPlayer) {
      throw new Error('Its not your turn cheater');
    }
    if (!this.isAllActions) {
      throw new Error('You can only check played cards');
    }
    this.tableCards = [];
    for (const card of cards) {
      const index = player.hand.findIndex((c) => c.id === card.id);
      if (index === -1) throw new Error('Card not found in hand');
      const [playedCard] = player.hand.splice(index, 1);
      this.tableCards.push(playedCard);
    }
    if (player.hand.length === 0) {
      this.toggleActions();
    }
    this.previousPlayer = currentPlayer;
    this.nextPlayer();
  }

  public nextPlayer() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  public getCurrentPlayerId(): string {
    return this.players[this.currentPlayerIndex]?.id;
  }

  public verifyLastPlayedCards(
    action: boolean,
    playerId: string,
    cardId: string,
  ): boolean {
    const player = this.players.find((p) => p.id === playerId);
    const currentPlayer = this.getCurrentPlayerId();
    if (!player) {
      throw new Error('Player not found');
    }
    if (player.id !== currentPlayer) {
      throw new Error('Its not your turn cheater');
    }

    if (this.tableCards.length === 0) {
      throw new Error('No cards on table to verify');
    }
    const chosenCard = this.tableCards.find((c) => c.id === cardId);

    if (!chosenCard) {
      throw new Error('No such cards');
    }

    const isMatch =
      chosenCard.rank === this.konCard || chosenCard.rank === 'JOKER';

    // Вернём true если игрок угадал правильно, иначе false
    return action === isMatch;
  }

  public nextTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  public isGameOver(): boolean {
    return this.players.every((p) => p.hand.length === 0);
  }
}
