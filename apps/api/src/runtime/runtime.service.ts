import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';
import { NodeHandlerRegistry } from './handlers/node-handler.registry';
import { AuditLogService } from '../audit/audit-log.service';
import { GuardrailsService } from '../guardrails/guardrails.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

const MAX_EXECUTION_STEPS = 100;

interface ExecutionContext {
  sessionId: string;
  botId: string;
  tenantId: string;
  flowGraph: any;
  variables: Record<string, any>;
  currentNodeId: string | null;
  stepCount: number;
  processedMessageIds: Set<string>;
}

@Injectable()
export class RuntimeService {
  constructor(
    private prisma: PrismaService,
    private nodeHandlerRegistry: NodeHandlerRegistry,
    private auditLogService: AuditLogService,
    private guardrailsService: GuardrailsService,
    private knowledgeService: KnowledgeService
  ) {}

  async processInbound(channel: string, payload: RuntimeInboundMessagePayload) {
    // 1. Verify channel signature (stub for web, real for LINE later)
    // For MVP, we'll skip signature verification for 'web' channel

    // 2. Resolve tenant+bot by channel connection
    const channelConnection = await this.prisma.channelConnection.findFirst({
      where: {
        channel,
        isActive: true,
      },
      include: {
        tenant: true,
        bot: {
          include: {
            versions: {
              where: { status: 'PUBLISHED' },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!channelConnection || !channelConnection.bot) {
      throw new NotFoundException(`No active bot found for channel: ${channel}`);
    }

    const bot = channelConnection.bot;
    const tenantId = channelConnection.tenantId;
    const botId = bot.id;

    // 3. Load active published bot version
    const activeVersion = bot.versions[0];
    if (!activeVersion) {
      throw new NotFoundException('No published version found for bot');
    }

    const flowGraph = activeVersion.flowGraph as any;

    // 4. Load/create ConversationSession
    let session = await this.prisma.conversationSession.findFirst({
      where: {
        channelConnectionId: channelConnection.id,
        externalUserId: payload.userId,
      },
    });

    if (!session) {
      session = await this.prisma.conversationSession.create({
        data: {
          channelConnectionId: channelConnection.id,
          externalUserId: payload.userId,
          botId,
          state: {},
          variables: {},
          currentNodeId: null,
        },
      });
    }

    // 5. Check idempotency
    const processedMessageIds = new Set<string>((session.state as any).processedMessageIds || []);

    if (processedMessageIds.has(payload.messageId)) {
      // Already processed, return existing response
      const lastMessages = await this.prisma.message.findMany({
        where: {
          sessionId: session.id,
          role: 'bot',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      return {
        messages: lastMessages.map((m) => ({
          type: 'text',
          content: m.content,
          metadata: m.metadata,
        })),
        sessionId: session.id,
      };
    }

    // 6. Apply guardrails
    const sanitizedText = payload.text || '';
    const { masked: maskedText, detected: detectedPII } =
      this.guardrailsService.maskPII(sanitizedText);
    const { filtered: filteredText, flagged: injectionFlagged } =
      this.guardrailsService.filterPromptInjection(maskedText);

    // Check KB-only mode
    const kbOnly = (bot.settings as any)?.kbOnly === true;
    if (kbOnly && filteredText) {
      // Try to retrieve from KB
      const collections = await this.prisma.knowledgeCollection.findMany({
        where: {
          tenantId,
          botId,
        },
      });

      if (collections.length > 0) {
        const retrievalResults = await Promise.all(
          collections.map((col) => this.knowledgeService.retrieve(col.id, filteredText, 3))
        );

        const allResults = retrievalResults.flat();
        if (allResults.length === 0) {
          // No KB results, return fallback message
          return {
            messages: [
              {
                type: 'text',
                content:
                  "I couldn't find relevant information in my knowledge base. Would you like to speak with a human agent?",
                metadata: {
                  kbOnly: true,
                  fallback: true,
                },
              },
            ],
            sessionId: session.id,
          };
        }

        // Use top result for answer
        const topResult = allResults[0];
        return {
          messages: [
            {
              type: 'text',
              content: topResult.chunk.content,
              metadata: {
                kbOnly: true,
                citation: {
                  sourceId: topResult.source.id,
                  chunkId: topResult.chunk.id,
                  score: topResult.score,
                },
              },
            },
          ],
          sessionId: session.id,
        };
      }
    }

    // 7. Persist inbound message (with masked PII for logging)
    await this.prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: filteredText, // Use filtered text for persistence
        metadata: {
          messageId: payload.messageId,
          type: payload.type,
          originalText: sanitizedText, // Keep original for processing
          detectedPII,
          injectionFlagged,
          ...payload.metadata,
        },
      },
    });

    // 8. Execute flow graph (use filtered text for processing)
    const context: ExecutionContext = {
      sessionId: session.id,
      botId,
      tenantId,
      flowGraph,
      variables: {
        ...((session.variables as any) || {}),
        __sessionId__: session.id, // Pass session ID for handoff
      },
      currentNodeId: (session.currentNodeId as string) || null,
      stepCount: 0,
      processedMessageIds,
    };

    const result = await this.executeFlow(context, {
      ...payload,
      text: filteredText, // Use filtered text
    });

    // 9. Update session state
    processedMessageIds.add(payload.messageId);
    await this.prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        variables: context.variables,
        currentNodeId: context.currentNodeId,
        state: {
          processedMessageIds: Array.from(processedMessageIds),
        },
      },
    });

    // 10. Persist outgoing messages (mask PII before saving)
    const outgoingMessages = [];
    for (const msg of result.messages) {
      // Mask PII in bot responses for logging
      const { masked: maskedContent } = this.guardrailsService.maskPII(msg.content);

      await this.prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'bot',
          content: maskedContent,
          metadata: {
            ...(msg.metadata || {}),
            originalContent: msg.content, // Keep original for delivery
          },
        },
      });
      // Send original (non-masked) to user
      outgoingMessages.push({
        type: msg.type,
        content: msg.content, // Send original to user
        metadata: msg.metadata,
      });
    }

    // 10. Persist trace spans
    for (const span of result.traceSpans) {
      await this.prisma.traceSpan.create({
        data: {
          sessionId: session.id,
          nodeId: span.nodeId,
          action: span.action,
          input: span.input,
          output: span.output,
          latency: span.latency,
          error: span.error,
        },
      });
    }

    return {
      messages: outgoingMessages,
      sessionId: session.id,
    };
  }

  private async executeFlow(
    context: ExecutionContext,
    inboundPayload: RuntimeInboundMessagePayload
  ): Promise<{
    messages: Array<{ type: string; content: string; metadata?: any }>;
    traceSpans: Array<{
      nodeId?: string;
      action: string;
      input?: any;
      output?: any;
      latency?: number;
      error?: string;
    }>;
  }> {
    const messages: Array<{ type: string; content: string; metadata?: any }> = [];
    const traceSpans: Array<{
      nodeId?: string;
      action: string;
      input?: any;
      output?: any;
      latency?: number;
      error?: string;
    }> = [];

    // Start from Start node if no current node
    if (!context.currentNodeId) {
      const startNode = context.flowGraph.nodes.find((n: any) => n.type === 'Start');
      if (!startNode) {
        throw new BadRequestException('Flow graph has no Start node');
      }
      context.currentNodeId = startNode.id;
    }

    // Execute flow with step limit
    while (context.currentNodeId && context.stepCount < MAX_EXECUTION_STEPS) {
      context.stepCount++;

      const currentNode = context.flowGraph.nodes.find((n: any) => n.id === context.currentNodeId);

      if (!currentNode) {
        throw new BadRequestException(`Node ${context.currentNodeId} not found in flow graph`);
      }

      const startTime = Date.now();
      let handlerResult;

      try {
        const handler = this.nodeHandlerRegistry.getHandler(currentNode.type);
        if (!handler) {
          throw new BadRequestException(`No handler found for node type: ${currentNode.type}`);
        }

        handlerResult = await handler.execute(
          currentNode,
          context.variables,
          inboundPayload,
          context.flowGraph,
          context.tenantId,
          context.botId
        );

        // Update variables
        if (handlerResult.variableUpdates) {
          context.variables = {
            ...context.variables,
            ...handlerResult.variableUpdates,
          };
        }

        // Collect messages
        if (handlerResult.outgoingMessages) {
          messages.push(...handlerResult.outgoingMessages);
        }

        // Collect trace spans
        traceSpans.push({
          nodeId: currentNode.id,
          action: `execute.${currentNode.type}`,
          input: { nodeId: currentNode.id, variables: context.variables },
          output: handlerResult,
          latency: Date.now() - startTime,
        });

        // Move to next node
        context.currentNodeId = handlerResult.nextNodeId || null;

        // Stop if reached End node
        if (currentNode.type === 'End' || !context.currentNodeId) {
          break;
        }
      } catch (error: any) {
        traceSpans.push({
          nodeId: currentNode.id,
          action: `execute.${currentNode.type}`,
          input: { nodeId: currentNode.id },
          error: error.message,
          latency: Date.now() - startTime,
        });

        // On error, try to find fallback or end
        const fallbackEdge = context.flowGraph.edges.find(
          (e: any) => e.source === currentNode.id && e.label === 'fallback'
        );
        if (fallbackEdge) {
          context.currentNodeId = fallbackEdge.target;
        } else {
          break;
        }
      }
    }

    if (context.stepCount >= MAX_EXECUTION_STEPS) {
      traceSpans.push({
        action: 'execution.max_steps_reached',
        error: `Execution exceeded maximum steps (${MAX_EXECUTION_STEPS})`,
      });
    }

    return { messages, traceSpans };
  }

  async simulate(tenantId: string, botId: string, message: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, tenantId },
      include: {
        flowGraphs: {
          where: { isDraft: true },
          take: 1,
        },
      },
    });

    if (!bot || !bot.flowGraphs[0]) {
      throw new NotFoundException('Bot or draft flow not found');
    }

    const flowGraph = bot.flowGraphs[0];
    const flowGraphData = {
      nodes: flowGraph.nodes as any,
      edges: flowGraph.edges as any,
      variables: flowGraph.variables as any,
    };

    // Create a temporary session for simulation
    const context: ExecutionContext = {
      sessionId: `sim-${Date.now()}`,
      botId,
      tenantId: bot.tenantId,
      flowGraph: flowGraphData,
      variables: {},
      currentNodeId: null,
      stepCount: 0,
      processedMessageIds: new Set(),
    };

    const payload: RuntimeInboundMessagePayload = {
      messageId: `sim-msg-${Date.now()}`,
      userId: 'sim-user',
      channel: 'web',
      text: message,
      type: 'text',
    };

    const result = await this.executeFlow(context, payload);

    return {
      messages: result.messages,
      traceSpans: result.traceSpans,
      variables: context.variables,
    };
  }
}
