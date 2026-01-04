import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async record(
    tenantId: string,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        targetType,
        targetId: targetId || null,
        metadata,
      },
    });
  }

  async findMany(query: {
    tenantId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, startDate, endDate, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...filters,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

