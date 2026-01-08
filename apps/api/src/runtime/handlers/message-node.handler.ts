import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class MessageNodeHandler implements NodeHandler {
  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any,
    _tenantId?: string,
    _botId?: string
  ): Promise<NodeHandlerResult> {
    // Replace variable placeholders in message content
    let content = node.data.content || '';

    // Simple variable substitution: {{variableName}}
    content = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });

    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    const nextNodeId = edges.length > 0 ? edges[0].target : null;

    return {
      outgoingMessages: [
        {
          type: 'text',
          content,
          metadata: {
            format: node.data.format || 'text',
          },
        },
      ],
      nextNodeId,
    };
  }
}
