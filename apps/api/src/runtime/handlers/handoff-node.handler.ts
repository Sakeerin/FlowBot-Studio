import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HandoffNodeHandler implements NodeHandler {
  constructor(private prisma: PrismaService) {}

  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any
  ): Promise<NodeHandlerResult> {
    // Get session ID from context (passed through execution context)
    const sessionId = (variables as any).__sessionId__;

    if (!sessionId) {
      throw new Error('Session ID not found in context');
    }

    // Create handoff ticket
    const ticket = await this.prisma.handoffTicket.create({
      data: {
        sessionId,
        status: 'open',
        priority: node.data.priority || 'normal',
        metadata: {
          queue: node.data.queue,
          message: node.data.message,
          variables: Object.fromEntries(
            Object.entries(variables).filter(([k]) => !k.startsWith('__'))
          ),
        },
      },
    });

    const message = node.data.message || 'Your request has been escalated to our support team.';

    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    const nextNodeId = edges.length > 0 ? edges[0].target : null;

    return {
      outgoingMessages: [
        {
          type: 'text',
          content: message,
          metadata: {
            handoffTicketId: ticket.id,
            priority: ticket.priority,
          },
        },
      ],
      nextNodeId,
      variableUpdates: {
        __handoffTicketId__: ticket.id,
      },
      traceSpans: [
        {
          action: 'handoff.create',
          input: { nodeId: node.id, priority: ticket.priority },
          output: { ticketId: ticket.id },
        },
      ],
    };
  }
}

