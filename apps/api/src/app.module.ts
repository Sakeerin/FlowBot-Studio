import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit/audit-log.module';
import { BotsModule } from './bots/bots.module';
import { RuntimeModule } from './runtime/runtime.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { GuardrailsModule } from './guardrails/guardrails.module';
import { ChannelsModule } from './channels/channels.module';
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    BotsModule,
    RuntimeModule,
    KnowledgeModule,
    GuardrailsModule,
    ChannelsModule,
    ToolsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
