import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { GameEngine } from '../game/engine/game.engine';
import { Server, Socket } from 'socket.io';
import { Card } from '../game/interfaces/card.interface';

interface Room {
  password?: string;
  clients: Record<string, { ready: boolean }>;
}

interface User {
  id: string;
  ready: boolean;
}

@WebSocketGateway({ cors: true })
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, Room> = new Map();
  private gameEngines: Map<string, GameEngine> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  private joinRoom(roomName: string, client: Socket) {
    const room = this.rooms.get(roomName);
    if (!room) {
      throw new Error('Room does not exist');
    }
    client.join(roomName);
    if (!room.clients[client.id]) {
      room.clients[client.id] = { ready: false };
    }

    this.server
      .to(client.id)
      .emit('userInfo', { roomName: roomName, id: client.id, ready: false });

    this.server.to(roomName).emit('roomJoined', {
      roomName: roomName,
      message: `User joined room${roomName}`,
      clients: this.rooms.get(roomName)?.clients,
    });

    this.server.to(roomName).emit('debug', {
      clients: this.rooms.get(roomName)?.clients,
      room: this.rooms.get(roomName),
      client: client.id,
    });
    return {
      room: roomName,
      message: `Joined room${roomName}`,
      clients: this.rooms.get(roomName)?.clients,
    };
  }

  private newGame(roomName: string) {
    const newGame = new GameEngine(roomName);
    this.gameEngines.set(roomName, newGame);
  }

  private getGameEngine(roomName: string) {
    return this.gameEngines.get(roomName);
  }

  private sendGameState(roomName: string) {
    const game = this.getGameEngine(roomName);
    const users = this.rooms.get(roomName)?.clients;

    if (!game || !users) {
      throw new Error('Game not found.');
    }
    const usersIds = Object.keys(users);
    const gameState = game.getState();

    usersIds.forEach((userId) => {
      const hand = game.sendHand(userId);
      this.server.to(userId).emit('hand', hand);
    });
    this.server.to(roomName).emit('gameState', gameState);
  }

  // @SubscribeMessage('createRoom')
  // handleCreateRoom(
  //   @MessageBody() data: { roomName: string; password?: string },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   if (this.rooms.has(data.roomName)) {
  //     return { error: 'Room already exists' };
  //   }
  //   this.rooms.set(data.roomName, {
  //     password: data.password,
  //     clients: new Set(),
  //   });
  //
  //   return { message: `Room ${data.roomName} created` };
  // }

  // @SubscribeMessage('joinRoom')
  // handleJoinRoom(
  //   @MessageBody()
  //   data: { roomName: string; username: string; password?: string },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   const room = this.rooms.get(data.roomName);
  //   if (!room) {
  //     return { error: 'Room does not exist' };
  //   }
  //   if (room.password && room.password !== data.password) {
  //     return { error: 'Invalid password' };
  //   }
  //   client.join(data.roomName);
  //   room.clients.add(client.id);
  //   this.server.to(data.roomName).emit('roomJoined', {
  //     roomName: data.roomName,
  //     message: `User ${data.username} (${client.id}) joined room ${data.roomName}`,
  //   });
  //
  //   return { room: data.roomName, message: `Joined room: ${data.roomName}` };
  // }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.rooms.get(data.roomName);

    if (!room) {
      throw new Error('Room does not exist');
    }
    const game = this.getGameEngine(data.roomName);

    if (game) {
      game.removePlayer(client.id);

      if (game.players.length <= 1) {
        console.log('1 Player left');
        this.server.to(data.roomName).emit('gameOver', { gameOver: true });

        setTimeout(() => {
          this.gameEngines.delete(data.roomName);
        }, 5000);
      }
    }

    client.leave(data.roomName);
    delete room.clients[client.id];
    this.server.to(data.roomName).emit('roomLeft', { clients: room.clients });

    if (Object.keys(room.clients).length === 0) {
      this.rooms.delete(data.roomName);
    }

    return { room: data.roomName, message: `Left room: ${data.roomName}` };
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody()
    data: { roomName: string; message: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.rooms.has(data.roomName)) {
      return { error: 'Room does not exist' };
    }

    this.server
      .to(data.roomName)
      .emit('message', { sender: data.username, message: data.message });
  }

  @SubscribeMessage('getRooms')
  handleGetRooms() {
    const roomList = Array.from(this.rooms.entries()).map(
      ([roomName, room]) => ({
        roomName,
        hasPassword: !!room.password,
      }),
    );

    this.server.emit('availableRooms', roomList);
  }

  @SubscribeMessage('toggleReady')
  handleToggleReady(
    @MessageBody() data: { roomName: string; ready: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.rooms.get(data.roomName)?.clients[client.id];
    const users = this.rooms.get(data.roomName)?.clients;
    const roomTimer = this.timers.has(data.roomName);

    if (!user || !users) {
      throw new Error('User not found');
    }

    user.ready = data.ready;

    const usersLength = Object.keys(users).length;

    this.server
      .to(data.roomName)
      .emit('playerStatus', { userId: client.id, ready: data.ready });

    const allReady = Object.values(users).every((status) => status.ready);

    if (allReady && usersLength > 1) {
      const timer = setTimeout(() => {
        this.server.to(data.roomName).emit('gameReady', {
          message: 'All players are ready!',
        });
        const playersIds = Object.keys(users);
        this.newGame(data.roomName);
        this.gameEngines.get(data.roomName)?.initPlayers(playersIds);
        this.sendGameState(data.roomName);
        this.timers.delete(data.roomName);
      }, 5000);

      this.timers.set(data.roomName, timer);

      this.server
        .to(data.roomName)
        .emit('timer', { message: 'Timer created', timers: this.timers });
    }
    if (!allReady && roomTimer) {
      clearTimeout(this.timers.get(data.roomName));
      this.timers.delete(data.roomName);

      this.server
        .to(data.roomName)
        .emit('abortTimer', { message: 'Timer aborted', timers: this.timers });
    }
  }

  @SubscribeMessage('quickGame')
  handleQuickGame(@ConnectedSocket() client: Socket) {
    if (this.rooms.size === 0) {
      this.rooms.set(`room${this.rooms.size}`, {
        clients: {},
      });
      return this.joinRoom(`room${this.rooms.size - 1}`, client);
    }
    const rooms = Array.from(this.rooms.entries());

    // const availableRoom = rooms.find(
    //   (room) =>
    //     Object.keys(room[1].clients).length >= 0 &&
    //     Object.keys(room[1].clients).length < 4,
    // );

    const availableRoom = rooms.filter(
      ([, room]) => Object.keys(room.clients).length < 4,
    );

    console.log('Available rooms info', availableRoom, availableRoom.length);

    if (availableRoom.length === 0) {
      this.rooms.set(`room${this.rooms.size}`, {
        clients: {},
      });

      return this.joinRoom(`room${this.rooms.size - 1}`, client);
    }

    const roomsWithoutEngine = availableRoom.filter(
      ([id]) => !this.gameEngines.has(id) && !this.timers.has(id),
    );
    console.log('No engine rooms info', roomsWithoutEngine);
    if (roomsWithoutEngine.length > 0) {
      const [roomId] = roomsWithoutEngine[0];
      return this.joinRoom(roomId, client);
    }

    this.rooms.set(`room${this.rooms.size}`, { clients: {} });
    return this.joinRoom(`room${this.rooms.size - 1}`, client);
  }

  @SubscribeMessage('playCards')
  handlePlayCards(
    @MessageBody() data: { roomName: string; playerId: string; cards: Card[] },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.getGameEngine(data.roomName);
    if (!game) {
      throw new Error('Game not found');
    }
    game.playCards(data.playerId, data.cards);

    this.sendGameState(data.roomName);
  }

  @SubscribeMessage('verifyPlayedCards')
  handleVerifyCards(
    @MessageBody()
    data: {
      roomName: string;
      playerId: string;
      action: boolean;
      cardId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.getGameEngine(data.roomName);
    if (!game) {
      throw new Error('Game not found');
    }
    const result = game.verifyLastPlayedCards(
      data.action,
      data.playerId,
      data.cardId,
    );

    this.server.to(data.roomName).emit('verifyResults', { result: result });

    if (result) {
      return this.server.to(data.roomName).emit('actionStatus', {
        userId: game.previousPlayer,
        haveToShoot: true,
      });
    }
    return this.server
      .to(data.roomName)
      .emit('actionStatus', { userId: client.id, haveToShoot: true });
  }

  @SubscribeMessage('pullTheTrigger')
  handlePullTheTrigger(
    @MessageBody()
    data: {
      roomName: string;
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.getGameEngine(data.roomName);
    if (!game) {
      throw new Error('Game not found');
    }
    const isAlive = game.pullTrigger(data.playerId);

    if (!isAlive) {
      this.server
        .to(data.roomName)
        .emit('shootResult', { result: 'Oops you are dead' });
      console.log('Game over', game.gameOver);
      if (game.gameOver) {
        this.server
          .to(data.roomName)
          .emit('gameOver', { gameOver: game.gameOver });
        setTimeout(() => {
          this.gameEngines.delete(data.roomName);
        }, 5000);
      }
    } else {
      this.server
        .to(data.roomName)
        .emit('shootResult', { result: 'You are lucky to be alive' });
      this.server.to(data.roomName).emit('newRound');
      this.sendGameState(data.roomName);
    }
  }
}
