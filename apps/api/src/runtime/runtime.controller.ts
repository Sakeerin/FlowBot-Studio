import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Post('inbound/:channel')
  async processInbound(
    @Param('channel') channel: string,
    @Body() payload: RuntimeInboundMessagePayload
  ) {
    return this.runtimeService.processInbound(channel, payload);
  }

  @Post('simulate/:botId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async simulate(
    @Param('botId') botId: string,
    @Body() body: { message: string },
    @CurrentUser() user: any
  ) {
    return this.runtimeService.simulate(user.tenantId, botId, body.message);
  }
}
