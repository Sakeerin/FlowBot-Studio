import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit/audit-log.module';
import { BotsModule } from './bots/bots.module';
import { RuntimeModule } from './runtime/runtime.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

