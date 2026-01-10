import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService, ConversationLogFilters } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('logs')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT, Role.VIEWER, Role.AUDITOR)
  async getConversationLogs(@Query() filters: ConversationLogFilters, @CurrentUser() user: any) {
    return this.analyticsService.getConversationLogs(user.tenantId, filters);
  }

  @Get('sessions/:sessionId/trace')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT, Role.VIEWER, Role.AUDITOR)
  async getSessionTrace(@Param('sessionId') sessionId: string, @CurrentUser() user: any) {
    return this.analyticsService.getSessionTrace(user.tenantId, sessionId);
  }

  @Get('rollups')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async getDailyRollups(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any
  ) {
    const defaultEndDate = endDate || new Date().toISOString().split('T')[0];
    const defaultStartDate =
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

    return this.analyticsService.getDailyRollups(user.tenantId, defaultStartDate, defaultEndDate);
  }

  @Get('overview')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async getOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any
  ) {
    const defaultEndDate = endDate || new Date().toISOString().split('T')[0];
    const defaultStartDate =
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

    return this.analyticsService.getOverviewMetrics(
      user.tenantId,
      defaultStartDate,
      defaultEndDate
    );
  }
}
