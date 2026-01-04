import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RbacGuard } from './rbac.guard';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RbacGuard>(RbacGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = createMockContext({ roles: [Role.BUILDER] });
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const context = createMockContext({ roles: [Role.ADMIN] });
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.OWNER]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    const context = createMockContext({ roles: [Role.BUILDER] });
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user has no roles', () => {
    const context = createMockContext({ roles: [] });
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user is not authenticated', () => {
    const context = createMockContext({});
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as ExecutionContext;
  }
});

