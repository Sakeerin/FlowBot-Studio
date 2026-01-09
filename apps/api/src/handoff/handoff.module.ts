import { Module } from '@nestjs/common';
import { HandoffService } from './handoff.service';
import { HandoffController } from './handoff.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [PrismaModule, AuditLogModule, GuardrailsModule, ChannelsModule],
  controllers: [HandoffController],
  providers: [HandoffService],
  exports: [HandoffService],
})
export class HandoffModule {}
