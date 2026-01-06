import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { FlowGraphValidator } from './flow-graph.validator';

@Module({
  controllers: [BotsController],
  providers: [BotsService, FlowGraphValidator],
  exports: [BotsService],
})
export class BotsModule {}

