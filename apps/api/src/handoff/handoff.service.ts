import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { GuardrailsService } from '../guardrails/guardrails.service';
import { ChannelAdapterFactory } from '../channels/adapters/channel-adapter.factory';
import { CreateHandoffTicket, UpdateHandoffTicket } from '@shared/schemas/handoff';

@Injectable()
export class HandoffService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private guardrailsService: GuardrailsService,
    private channelAdapterFactory: ChannelAdapterFactory
  ) {}

  async create(tenantId: string, dto: CreateHandoffTicket) {
    // Verify session exists and belongs to tenant
    const session = await this.prisma.conversationSession.findFirst({
      where: {
        id: dto.sessionId,
        channelConnection: {
          tenantId,
        },
      },
      include: {
        channelConnection: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const ticket = await this.prisma.handoffTicket.create({
      data: {
        sessionId: dto.sessionId,
        status: 'open',
        priority: dto.priority || 'normal',
        assignedTo: dto.assignedTo || null,
        metadata: dto.metadata || {},
      },
      include: {
        session: {
          include: {
            channelConnection: {
              include: {
                bot: true,
              },
            },
          },
        },
      },
    });

    await this.auditLogService.record(
      tenantId,
      'system',
      'handoff.create',
      'HandoffTicket',
      ticket.id,
      { priority: ticket.priority }
    );

    return ticket;
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      assignedTo?: string;
      priority?: string;
      search?: string;
    }
  ) {
    const where: any = {
      session: {
        channelConnection: {
          tenantId,
        },
      },
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.search) {
      // Search in external user ID and ticket ID
      where.OR = [
        {
          session: {
            externalUserId: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          id: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const tickets = await this.prisma.handoffTicket.findMany({
      where,
      include: {
        session: {
          include: {
            channelConnection: {
              include: {
                bot: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 50, // Get last 50 messages for preview
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { priority: 'desc' }],
    });

    return tickets.map((ticket) => this.maskTicketPII(ticket));
  }

  async findOne(tenantId: string, ticketId: string) {
    const ticket = await this.prisma.handoffTicket.findFirst({
      where: {
        id: ticketId,
        session: {
          channelConnection: {
            tenantId,
          },
        },
      },
      include: {
        session: {
          include: {
            channelConnection: {
              include: {
                bot: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.maskTicketPII(ticket);
  }

  async update(tenantId: string, userId: string, ticketId: string, dto: UpdateHandoffTicket) {
    const ticket = await this.findOne(tenantId, ticketId);

    const updated = await this.prisma.handoffTicket.update({
      where: { id: ticketId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo || null }),
        ...(dto.metadata && { metadata: { ...ticket.metadata, ...dto.metadata } }),
      },
      include: {
        session: {
          include: {
            channelConnection: true,
          },
        },
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'handoff.update',
      'HandoffTicket',
      ticketId,
      { changes: dto }
    );

    return this.maskTicketPII(updated);
  }

  async sendAgentMessage(tenantId: string, userId: string, ticketId: string, content: string) {
    const ticket = await this.findOne(tenantId, ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot send message to closed ticket');
    }

    // Get session and channel connection
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: ticket.sessionId },
      include: {
        channelConnection: true,
      },
    });

    if (!session || !session.channelConnection) {
      throw new NotFoundException('Session or channel connection not found');
    }

    // Create agent message in database (unmasked for delivery)
    const message = await this.prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'agent',
        content,
        metadata: {
          agentId: userId,
          ticketId,
        },
      },
    });

    // Send message directly through channel adapter (bypass flow execution)
    const channel = session.channelConnection.channel;
    const adapter = this.channelAdapterFactory.getAdapter(channel);

    try {
      // Send agent message directly to user through channel
      await adapter.sendMessage(
        session.externalUserId,
        {
          type: 'text',
          content,
          metadata: {
            agentId: userId,
            ticketId,
            fromAgent: true,
          },
        },
        session.channelConnection.config as any
      );

      // Also persist as bot message in the session for conversation history
      await this.prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'bot',
          content,
          metadata: {
            agentId: userId,
            ticketId,
            fromAgent: true,
          },
        },
      });
    } catch (error: any) {
      // Log error but don't fail - message is saved in DB
      console.error('Failed to send agent message through channel:', error);
    }

    await this.auditLogService.record(
      tenantId,
      userId,
      'handoff.message.send',
      'HandoffTicket',
      ticketId,
      { messageId: message.id }
    );

    return message;
  }

  async addNote(tenantId: string, userId: string, ticketId: string, note: string) {
    const ticket = await this.findOne(tenantId, ticketId);

    const notes = ((ticket.metadata as any)?.notes || []) as any[];
    notes.push({
      id: `note-${Date.now()}`,
      userId,
      content: note,
      createdAt: new Date().toISOString(),
    });

    const updated = await this.prisma.handoffTicket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...ticket.metadata,
          notes,
        },
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'handoff.note.add',
      'HandoffTicket',
      ticketId,
      { noteId: notes[notes.length - 1].id }
    );

    return updated;
  }

  async addTags(tenantId: string, userId: string, ticketId: string, tags: string[]) {
    const ticket = await this.findOne(tenantId, ticketId);

    const existingTags = ((ticket.metadata as any)?.tags || []) as string[];
    const newTags = Array.from(new Set([...existingTags, ...tags]));

    const updated = await this.prisma.handoffTicket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...ticket.metadata,
          tags: newTags,
        },
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'handoff.tags.add',
      'HandoffTicket',
      ticketId,
      { tags }
    );

    return updated;
  }

  async removeTag(tenantId: string, userId: string, ticketId: string, tag: string) {
    const ticket = await this.findOne(tenantId, ticketId);

    const existingTags = ((ticket.metadata as any)?.tags || []) as string[];
    const newTags = existingTags.filter((t) => t !== tag);

    const updated = await this.prisma.handoffTicket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...ticket.metadata,
          tags: newTags,
        },
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'handoff.tag.remove',
      'HandoffTicket',
      ticketId,
      { tag }
    );

    return updated;
  }

  async getSLAStatus(tenantId: string, ticketId: string) {
    const ticket = await this.findOne(tenantId, ticketId);

    const slaThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    const createdAt = new Date(ticket.createdAt).getTime();
    const age = now - createdAt;

    const isUnassigned = ticket.status === 'open' && !ticket.assignedTo;
    const isOverdue = isUnassigned && age > slaThreshold;

    return {
      ticketId: ticket.id,
      status: ticket.status,
      isUnassigned,
      isOverdue,
      age,
      ageFormatted: this.formatAge(age),
      threshold: slaThreshold,
    };
  }

  async checkSLAAlerts(tenantId: string) {
    const openTickets = await this.prisma.handoffTicket.findMany({
      where: {
        status: 'open',
        assignedTo: null,
        session: {
          channelConnection: {
            tenantId,
          },
        },
      },
    });

    const slaThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    const alerts = openTickets
      .filter((ticket) => {
        const age = now - new Date(ticket.createdAt).getTime();
        return age > slaThreshold;
      })
      .map((ticket) => ({
        ticketId: ticket.id,
        age: now - new Date(ticket.createdAt).getTime(),
        ageFormatted: this.formatAge(now - new Date(ticket.createdAt).getTime()),
        priority: ticket.priority,
      }));

    return alerts;
  }

  private maskTicketPII(ticket: any): any {
    // Mask PII in messages for agent view
    // Only mask user messages, keep bot/agent messages as-is for context
    if (ticket.session?.messages) {
      ticket.session.messages = ticket.session.messages.map((msg: any) => {
        if (msg.role === 'user') {
          const { masked } = this.guardrailsService.maskPII(msg.content);
          return {
            ...msg,
            content: masked,
            originalContent: msg.content, // Keep original for agent to see when needed
          };
        }
        return msg;
      });
    }

    // Mask PII in metadata
    if (ticket.metadata?.message) {
      const { masked } = this.guardrailsService.maskPII(ticket.metadata.message);
      ticket.metadata = {
        ...ticket.metadata,
        message: masked,
      };
    }

    return ticket;
  }

  private formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
