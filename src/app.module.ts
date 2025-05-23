import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocketModule } from './socket/socket.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [SocketModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
