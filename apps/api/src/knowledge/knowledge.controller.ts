import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateKnowledgeCollection,
  CreateKnowledgeSource,
} from '@shared/schemas/knowledge';

@Controller('bots/:botId/kb')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.VIEWER)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('collections')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async createCollection(
    @Param('botId') botId: string,
    @Body() dto: CreateKnowledgeCollection,
    @CurrentUser() user: any
  ) {
    return this.knowledgeService.createCollection(
      user.tenantId,
      user.id,
      { ...dto, botId }
    );
  }

  @Get('collections')
  async getCollections(
    @Param('botId') botId: string,
    @CurrentUser() user: any
  ) {
    return this.knowledgeService.getCollections(user.tenantId, botId);
  }

  @Get('collections/:collectionId')
  async getCollection(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: any
  ) {
    return this.knowledgeService.getCollection(user.tenantId, collectionId);
  }

  @Post('sources')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER)
  async addSource(
    @Param('botId') botId: string,
    @Body() dto: CreateKnowledgeSource & { collectionId: string },
    @CurrentUser() user: any
  ) {
    const { collectionId, ...sourceData } = dto;
    return this.knowledgeService.addSource(
      user.tenantId,
      user.id,
      collectionId,
      sourceData
    );
  }

  @Get('status')
  async getKBStatus(
    @Param('botId') botId: string,
    @CurrentUser() user: any
  ) {
    return this.knowledgeService.getKBStatus(user.tenantId, botId);
  }

  @Post('retrieve')
  @Roles(Role.BUILDER, Role.ADMIN, Role.OWNER, Role.AGENT)
  async retrieve(
    @Body() body: { collectionId: string; query: string },
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @CurrentUser() user: any
  ) {
    return this.knowledgeService.retrieve(body.collectionId, body.query, limit);
  }
}

