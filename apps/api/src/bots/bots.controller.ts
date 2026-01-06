import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateBot, UpdateBot, PublishBotRequest } from '@shared/schemas/bot';
import { FlowGraphDto } from '@shared/schemas/flow';

@Controller('bots')
@UseGuards(JwtAuthGuard, RbacGuard)
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Post()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async create(@Body() dto: CreateBot, @CurrentUser() user: any) {
    return this.botsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findAll(@CurrentUser() user: any) {
    return this.botsService.findAll(user.tenantId, user.id, user.roles);
  }

  @Get(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.botsService.findOne(user.tenantId, id, user.roles);
  }

  @Put(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBot,
    @CurrentUser() user: any
  ) {
    return this.botsService.update(user.tenantId, id, user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.botsService.delete(user.tenantId, id, user.id);
    return { message: 'Bot deleted successfully' };
  }

  @Get(':id/draft/flow')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async getDraftFlow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.botsService.getDraftFlow(user.tenantId, id);
  }

  @Put(':id/draft/flow')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async saveDraftFlow(
    @Param('id') id: string,
    @Body() flowGraph: FlowGraphDto,
    @CurrentUser() user: any
  ) {
    return this.botsService.saveDraftFlow(
      user.tenantId,
      id,
      user.id,
      flowGraph
    );
  }

  @Post(':id/publish')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishBotRequest,
    @CurrentUser() user: any
  ) {
    return this.botsService.publish(user.tenantId, id, user.id, dto);
  }

  @Post(':id/rollback')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async rollback(
    @Param('id') id: string,
    @Query('version') version: number,
    @CurrentUser() user: any
  ) {
    return this.botsService.rollback(user.tenantId, id, version, user.id);
  }
}

