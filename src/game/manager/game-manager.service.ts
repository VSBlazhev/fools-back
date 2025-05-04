import { Injectable } from '@nestjs/common';
import { GameEngine } from '../engine/game.engine';

@Injectable()
export class GameManagerService {
  private games: Map<string, GameEngine> = new Map();

  createGame(roomId: string, players: string[]): GameEngine {
    const game = new GameEngine(roomId);
    game.initPlayers(players);
    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string): GameEngine | undefined {
    return this.games.get(roomId);
  }

  removeGame(roomId: string): void {
    this.games.delete(roomId);
  }
}
