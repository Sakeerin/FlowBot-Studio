import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly defaultLimit = 100; // requests per window
  private readonly defaultWindow = 60 * 1000; // 1 minute in milliseconds

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Skip rate limiting for health checks
    if (request.url.startsWith('/health') || request.url.startsWith('/api/health')) {
      return true;
    }

    // Get rate limit metadata (could be extended with decorator)
    const limit = this.reflector.get<number>('rateLimit', handler) || this.defaultLimit;
    const window = this.reflector.get<number>('rateLimitWindow', handler) || this.defaultWindow;

    const key = this.getKey(request);
    const now = Date.now();

    // Clean up expired entries (simple cleanup)
    this.cleanup(now);

    const record = this.store[key];

    if (!record || now > record.resetTime) {
      // Create new record
      this.store[key] = {
        count: 1,
        resetTime: now + window,
      };
      return true;
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: any): string {
    // Use IP address and user ID if available
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private cleanup(now: number): void {
    // Simple cleanup: remove expired entries
    // In production, use Redis or similar for distributed systems
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}
