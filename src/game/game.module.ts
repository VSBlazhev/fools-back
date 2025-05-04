import { Module } from '@nestjs/common';
import { GameManagerService } from './manager/game-manager.service';

@Module({
  providers: [GameManagerService],
  exports: [GameManagerService],
})
export class GameModule {}
