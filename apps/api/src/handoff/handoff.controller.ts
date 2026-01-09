import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HandoffService } from './handoff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateHandoffTicket, UpdateHandoffTicket } from '@shared/schemas/handoff';

@Controller('handoff')
@UseGuards(JwtAuthGuard, RbacGuard)
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Post()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async create(@Body() dto: CreateHandoffTicket, @CurrentUser() user: any) {
    return this.handoffService.create(user.tenantId, dto);
  }

  @Get()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT, Role.VIEWER)
  async findAll(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any
  ) {
    return this.handoffService.findAll(user.tenantId, {
      status,
      assignedTo,
      priority,
      search,
    });
  }

  @Get('alerts')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async getSLAAlerts(@CurrentUser() user: any) {
    return this.handoffService.checkSLAAlerts(user.tenantId);
  }

  @Get(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT, Role.VIEWER)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.handoffService.findOne(user.tenantId, id);
  }

  @Get(':id/sla')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async getSLAStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.handoffService.getSLAStatus(user.tenantId, id);
  }

  @Put(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHandoffTicket,
    @CurrentUser() user: any
  ) {
    return this.handoffService.update(user.tenantId, user.id, id, dto);
  }

  @Post(':id/message')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser() user: any
  ) {
    return this.handoffService.sendAgentMessage(user.tenantId, user.id, id, body.content);
  }

  @Post(':id/notes')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async addNote(@Param('id') id: string, @Body() body: { note: string }, @CurrentUser() user: any) {
    return this.handoffService.addNote(user.tenantId, user.id, id, body.note);
  }

  @Post(':id/tags')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async addTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] },
    @CurrentUser() user: any
  ) {
    return this.handoffService.addTags(user.tenantId, user.id, id, body.tags);
  }

  @Delete(':id/tags/:tag')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async removeTag(@Param('id') id: string, @Param('tag') tag: string, @CurrentUser() user: any) {
    return this.handoffService.removeTag(user.tenantId, user.id, id, tag);
  }
}
