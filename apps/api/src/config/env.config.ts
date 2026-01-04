import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { envSchema, type Env } from '@shared/schemas/env';

@Injectable()
export class EnvConfig {
  private readonly env: Env;

  constructor(private configService: ConfigService) {
    this.env = envSchema.parse({
      DATABASE_URL: this.configService.get<string>('DATABASE_URL'),
      REDIS_URL: this.configService.get<string>('REDIS_URL'),
      JWT_SECRET: this.configService.get<string>('JWT_SECRET'),
      JWT_REFRESH_SECRET: this.configService.get<string>('JWT_REFRESH_SECRET'),
      JWT_EXPIRES_IN: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      JWT_REFRESH_EXPIRES_IN: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      ENCRYPTION_KEY: this.configService.get<string>('ENCRYPTION_KEY'),
      LINE_CHANNEL_SECRET: this.configService.get<string>('LINE_CHANNEL_SECRET'),
      LINE_CHANNEL_ACCESS_TOKEN: this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN'),
      NODE_ENV: this.configService.get<string>('NODE_ENV', 'development'),
      PORT: this.configService.get<string>('PORT', '3001'),
      API_PORT: this.configService.get<string>('API_PORT', '3001'),
      WEB_PORT: this.configService.get<string>('WEB_PORT', '3000'),
    });
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get jwtRefreshSecret(): string {
    return this.env.JWT_REFRESH_SECRET;
  }

  get jwtExpiresIn(): string {
    return this.env.JWT_EXPIRES_IN;
  }

  get jwtRefreshExpiresIn(): string {
    return this.env.JWT_REFRESH_EXPIRES_IN;
  }

  get encryptionKey(): string {
    return this.env.ENCRYPTION_KEY;
  }

  get lineChannelSecret(): string | undefined {
    return this.env.LINE_CHANNEL_SECRET;
  }

  get lineChannelAccessToken(): string | undefined {
    return this.env.LINE_CHANNEL_ACCESS_TOKEN;
  }

  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }

  get port(): number {
    return parseInt(this.env.PORT, 10);
  }
}

