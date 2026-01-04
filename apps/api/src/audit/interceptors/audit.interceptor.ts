import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_ACTION_KEY, AUDIT_TARGET_TYPE_KEY } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditLogService: AuditLogService,
    private reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only audit authenticated requests
    if (!user) {
      return next.handle();
    }

    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const targetType = this.reflector.getAllAndOverride<string>(AUDIT_TARGET_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip if not decorated
    if (!action || !targetType) {
      return next.handle();
    }

    // Extract target ID from params or body
    const targetId = request.params?.id || request.body?.id || null;

    return next.handle().pipe(
      tap(() => {
        // Record audit log asynchronously (fire and forget)
        this.auditLogService
          .record(user.tenantId, user.id, action, targetType, targetId, {
            method: request.method,
            url: request.url,
          })
          .catch((error) => {
            console.error('Failed to record audit log:', error);
          });
      })
    );
  }
}

