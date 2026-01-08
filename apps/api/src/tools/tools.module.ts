import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { ToolExecutorService } from './tool-executor.service';
import { EncryptionService } from './encryption.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ToolsController],
  providers: [ToolsService, ToolExecutorService, EncryptionService],
  exports: [ToolsService, ToolExecutorService, EncryptionService],
})
export class ToolsModule {}
