import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class AiAnswerNodeHandler implements NodeHandler {
  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any,
    _tenantId?: string,
    _botId?: string
  ): Promise<NodeHandlerResult> {
    const prompt = node.data.prompt || '';
    const contextVariables = node.data.contextVariables || [];

    // Build context from variables
    const context: Record<string, any> = {};
    for (const varName of contextVariables) {
      if (variables[varName] !== undefined) {
        context[varName] = variables[varName];
      }
    }

    // Stub implementation - AI integration will be added later
    // For MVP, return a placeholder message
    const answer = `[AI Answer] ${prompt}\nContext: ${JSON.stringify(context)}`;

    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    const nextNodeId = edges.length > 0 ? edges[0].target : null;

    return {
      outgoingMessages: [
        {
          type: 'text',
          content: answer,
          metadata: {
            aiGenerated: true,
            temperature: node.data.temperature || 0.7,
          },
        },
      ],
      nextNodeId,
      traceSpans: [
        {
          action: 'ai.answer',
          input: { prompt, context },
          output: { answer },
        },
      ],
    };
  }
}
