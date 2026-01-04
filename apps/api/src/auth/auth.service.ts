import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponse } from '@shared/schemas/auth';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogService: AuditLogService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Find or create tenant by email domain
    const emailDomain = dto.email.split('@')[1];
    let tenant = await this.prisma.tenant.findUnique({
      where: { domain: emailDomain },
    });

    if (!tenant) {
      // Auto-create tenant for MVP (can be configured with allowlist later)
      tenant = await this.prisma.tenant.create({
        data: {
          name: emailDomain.split('.')[0],
          domain: emailDomain,
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        tenantId: tenant.id,
      },
    });

    // Assign BUILDER role by default
    await this.prisma.roleAssignment.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: Role.BUILDER,
      },
    });

    // Audit log
    await this.auditLogService.record(tenant.id, user.id, 'user.register', 'User', user.id, {
      email: dto.email,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, tenant.id);
    const roles = await this.getUserRoles(user.id, tenant.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        tenantId: user.tenantId,
        roles,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get roles
    const roles = await this.getUserRoles(user.id, user.tenantId);

    // Audit log
    await this.auditLogService.record(user.tenantId, user.id, 'user.login', 'User', user.id, {});

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.tenantId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        tenantId: user.tenantId,
        roles,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const roles = await this.getUserRoles(user.id, user.tenantId);
      const tokens = await this.generateTokens(user.id, user.tenantId);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || null,
          tenantId: user.tenantId,
          roles,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, tenantId: string): Promise<void> {
    // Audit log
    await this.auditLogService.record(tenantId, userId, 'user.logout', 'User', userId, {});
    // In a real implementation, you might want to blacklist the refresh token
    // For MVP, we'll just log the logout event
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const roles = await this.getUserRoles(user.id, user.tenantId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      roles,
    };
  }

  private async generateTokens(userId: string, tenantId: string) {
    const payload = { sub: userId, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        tenantId,
      },
      select: {
        role: true,
      },
    });

    return assignments.map((a) => a.role);
  }
}

