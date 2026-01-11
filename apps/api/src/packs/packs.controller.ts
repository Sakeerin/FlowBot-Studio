import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PacksService } from './packs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { InstallPackRequest } from '@shared/schemas/pack';

@Controller('packs')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async findAll() {
    return this.packsService.findAll();
  }

  @Get(':id')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
  async findOne(@Param('id') id: string) {
    return this.packsService.findOne(id);
  }

  @Post('install')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async install(@Body() dto: InstallPackRequest, @CurrentUser() user: any) {
    return this.packsService.install(user.tenantId, user.id, dto);
  }

  @Post(':id/install-new-version')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async installNewVersion(
    @Param('id') id: string,
    @Body() body: { botName?: string },
    @CurrentUser() user: any
  ) {
    return this.packsService.installNewVersion(user.tenantId, user.id, id, body.botName);
  }
}
