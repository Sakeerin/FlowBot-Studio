import { Module } from '@nestjs/common';
import { PacksService } from './packs.service';
import { PacksController } from './packs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BotsModule } from '../bots/bots.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [PrismaModule, BotsModule, KnowledgeModule, ToolsModule],
  controllers: [PacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
