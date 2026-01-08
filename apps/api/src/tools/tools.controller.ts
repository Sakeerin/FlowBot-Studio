import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateTool } from '@shared/schemas/tool';

@Controller('tools')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async create(@Body() dto: CreateTool, @CurrentUser() user: any) {
    return this.toolsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findAll(@CurrentUser() user: any) {
    return this.toolsService.findAll(user.tenantId);
  }

  @Get(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER, Role.AGENT)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.toolsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTool>,
    @CurrentUser() user: any
  ) {
    return this.toolsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.toolsService.delete(user.tenantId, user.id, id);
  }

  @Post(':id/execute')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async execute(
    @Param('id') id: string,
    @Body() body: { input: Record<string, any> },
    @CurrentUser() user: any
  ) {
    return this.toolsService.execute(user.tenantId, id, body.input);
  }
}
