import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardrailsService } from '../guardrails/guardrails.service';

export interface ConversationLogFilters {
  startDate?: string;
  endDate?: string;
  botId?: string;
  channel?: string;
  hasHandoff?: boolean;
  hasFallback?: boolean;
  search?: string;
}

export interface AnalyticsRollup {
  date: string;
  sessionsCount: number;
  messagesCount: number;
  fallbackRate: number;
  handoffRate: number;
  toolErrorRate: number;
  kbHitRate: number;
  avgResponseTime: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private guardrailsService: GuardrailsService
  ) {}

  async getConversationLogs(tenantId: string, filters: ConversationLogFilters = {}) {
    const where: any = {
      channelConnection: {
        tenantId,
      },
    };

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Bot filter
    if (filters.botId) {
      where.botId = filters.botId;
    }

    // Channel filter
    if (filters.channel) {
      where.channelConnection = {
        ...where.channelConnection,
        channel: filters.channel,
      };
    }

    // Handoff filter
    if (filters.hasHandoff !== undefined) {
      const handoffTickets = await this.prisma.handoffTicket.findMany({
        where: {
          session: {
            channelConnection: {
              tenantId,
            },
          },
        },
        select: { sessionId: true },
      });

      const sessionIdsWithHandoff = new Set(handoffTickets.map((t) => t.sessionId));

      if (filters.hasHandoff) {
        where.id = {
          in: Array.from(sessionIdsWithHandoff),
        };
      } else {
        where.id = {
          notIn: Array.from(sessionIdsWithHandoff),
        };
      }
    }

    // Fallback filter (sessions with KB-only fallback)
    // Note: Prisma JSON filtering is limited, so we need to get sessions with fallback messages
    if (filters.hasFallback !== undefined) {
      // Get all messages with fallback metadata
      const allMessages = await this.prisma.message.findMany({
        where: {
          role: 'bot',
          session: {
            channelConnection: {
              tenantId,
            },
          },
        },
        select: {
          sessionId: true,
          metadata: true,
        },
      });

      // Filter messages that have fallback: true in metadata
      const fallbackSessionIds = new Set<string>();
      allMessages.forEach((msg) => {
        const metadata = msg.metadata as any;
        if (metadata?.fallback === true) {
          fallbackSessionIds.add(msg.sessionId);
        }
      });

      if (filters.hasFallback) {
        where.id = {
          in: Array.from(fallbackSessionIds),
        };
      } else if (fallbackSessionIds.size > 0) {
        where.id = {
          notIn: Array.from(fallbackSessionIds),
        };
      }
    }

    // Search filter (in messages)
    if (filters.search) {
      where.messages = {
        some: {
          content: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      };
    }

    const sessions = await this.prisma.conversationSession.findMany({
      where,
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
          take: 100, // Limit messages per session for performance
        },
        traceSpans: {
          orderBy: { createdAt: 'asc' },
        },
        handoffTickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 most recent sessions
    });

    // Mask PII in messages
    return sessions.map((session) => this.maskSessionPII(session));
  }

  async getSessionTrace(tenantId: string, sessionId: string) {
    const session = await this.prisma.conversationSession.findFirst({
      where: {
        id: sessionId,
        channelConnection: {
          tenantId,
        },
      },
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
        traceSpans: {
          orderBy: { createdAt: 'asc' },
        },
        handoffTickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.maskSessionPII(session);
  }

  async getDailyRollups(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsRollup[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const rollups: AnalyticsRollup[] = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get sessions for this day
      const sessions = await this.prisma.conversationSession.findMany({
        where: {
          channelConnection: {
            tenantId,
          },
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        include: {
          messages: true,
          traceSpans: true,
          handoffTickets: true,
        },
      });

      const sessionsCount = sessions.length;
      const messagesCount = sessions.reduce((sum, s) => sum + s.messages.length, 0);

      // Count fallbacks (messages with fallback metadata)
      const fallbackCount = sessions.reduce((sum, s) => {
        return sum + s.messages.filter((m) => (m.metadata as any)?.fallback === true).length;
      }, 0);

      // Count handoffs
      const handoffCount = sessions.reduce((sum, s) => sum + s.handoffTickets.length, 0);

      // Count tool errors from trace spans
      const toolErrorCount = sessions.reduce((sum, s) => {
        return (
          sum + s.traceSpans.filter((t) => t.action === 'tool.call' && t.error !== null).length
        );
      }, 0);

      // Count tool calls
      const toolCallCount = sessions.reduce((sum, s) => {
        return sum + s.traceSpans.filter((t) => t.action === 'tool.call').length;
      }, 0);

      // Count KB hits (messages with KB citation)
      const kbHitCount = sessions.reduce((sum, s) => {
        return sum + s.messages.filter((m) => (m.metadata as any)?.citation !== undefined).length;
      }, 0);

      // Calculate average response time from trace spans
      const responseTimes = sessions
        .flatMap((s) => s.traceSpans)
        .filter((t) => t.latency !== null)
        .map((t) => t.latency!);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          : 0;

      rollups.push({
        date: dateStr,
        sessionsCount,
        messagesCount,
        fallbackRate: sessionsCount > 0 ? fallbackCount / sessionsCount : 0,
        handoffRate: sessionsCount > 0 ? handoffCount / sessionsCount : 0,
        toolErrorRate: toolCallCount > 0 ? toolErrorCount / toolCallCount : 0,
        kbHitRate: messagesCount > 0 ? kbHitCount / messagesCount : 0,
        avgResponseTime,
      });
    }

    return rollups;
  }

  async getOverviewMetrics(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.conversationSession.findMany({
      where: {
        channelConnection: {
          tenantId,
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        messages: true,
        traceSpans: true,
        handoffTickets: true,
      },
    });

    const sessionsCount = sessions.length;
    const messagesCount = sessions.reduce((sum, s) => sum + s.messages.length, 0);

    const fallbackCount = sessions.reduce((sum, s) => {
      return sum + s.messages.filter((m) => (m.metadata as any)?.fallback === true).length;
    }, 0);

    const handoffCount = sessions.reduce((sum, s) => sum + s.handoffTickets.length, 0);

    const toolErrorCount = sessions.reduce((sum, s) => {
      return sum + s.traceSpans.filter((t) => t.action === 'tool.call' && t.error !== null).length;
    }, 0);

    const toolCallCount = sessions.reduce((sum, s) => {
      return sum + s.traceSpans.filter((t) => t.action === 'tool.call').length;
    }, 0);

    const kbHitCount = sessions.reduce((sum, s) => {
      return sum + s.messages.filter((m) => (m.metadata as any)?.citation !== undefined).length;
    }, 0);

    const responseTimes = sessions
      .flatMap((s) => s.traceSpans)
      .filter((t) => t.latency !== null)
      .map((t) => t.latency!);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    return {
      sessionsCount,
      messagesCount,
      fallbackRate: sessionsCount > 0 ? fallbackCount / sessionsCount : 0,
      handoffRate: sessionsCount > 0 ? handoffCount / sessionsCount : 0,
      toolErrorRate: toolCallCount > 0 ? toolErrorCount / toolCallCount : 0,
      kbHitRate: messagesCount > 0 ? kbHitCount / messagesCount : 0,
      avgResponseTime: Math.round(avgResponseTime),
      toolCallCount,
      toolErrorCount,
      kbHitCount,
      handoffCount,
      fallbackCount,
    };
  }

  private maskSessionPII(session: any): any {
    // Mask PII in messages
    if (session.messages) {
      session.messages = session.messages.map((msg: any) => {
        if (msg.role === 'user') {
          const { masked } = this.guardrailsService.maskPII(msg.content);
          return {
            ...msg,
            content: masked,
            originalContent: msg.content,
          };
        }
        return msg;
      });
    }

    // Mask PII in trace spans
    if (session.traceSpans) {
      session.traceSpans = session.traceSpans.map((span: any) => {
        if (span.input && typeof span.input === 'object') {
          const inputStr = JSON.stringify(span.input);
          const { masked } = this.guardrailsService.maskPII(inputStr);
          return {
            ...span,
            input: JSON.parse(masked),
            originalInput: span.input,
          };
        }
        return span;
      });
    }

    return session;
  }
}
