import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateChannelConnection,
  UpdateChannelConnection,
} from '@shared/schemas/channel';

@Controller('channels')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async create(
    @Body() dto: CreateChannelConnection,
    @CurrentUser() user: any
  ) {
    return this.channelsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findAll(@CurrentUser() user: any) {
    return this.channelsService.findAll(user.tenantId);
  }

  @Get(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.channelsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelConnection,
    @CurrentUser() user: any
  ) {
    return this.channelsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.channelsService.delete(user.tenantId, user.id, id);
  }

  @Get(':id/health')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async getHealthStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.channelsService.getHealthStatus(user.tenantId, id);
  }
}

