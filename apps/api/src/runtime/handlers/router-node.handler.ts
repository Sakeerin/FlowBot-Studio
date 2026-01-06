import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class RouterNodeHandler implements NodeHandler {
  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any
  ): Promise<NodeHandlerResult> {
    const intentKeyword = node.data.intentKeyword?.toLowerCase() || '';
    const userText = (inboundPayload.text || '').toLowerCase();

    // Check if user text contains the intent keyword
    const matches = userText.includes(intentKeyword);

    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    let nextNodeId: string | null = null;

    if (matches) {
      // Find edge labeled as 'match' or first edge
      const matchEdge = edges.find((e: any) => e.label === 'match') || edges[0];
      nextNodeId = matchEdge?.target || null;
    } else {
      // Use fallback node or edge labeled as 'fallback'
      if (node.data.fallbackNodeId) {
        nextNodeId = node.data.fallbackNodeId;
      } else {
        const fallbackEdge = edges.find((e: any) => e.label === 'fallback');
        nextNodeId = fallbackEdge?.target || edges[0]?.target || null;
      }
    }

    return {
      nextNodeId,
      traceSpans: [
        {
          action: 'router.route',
          input: { intentKeyword, userText, matches },
          output: { nextNodeId },
        },
      ],
    };
  }
}

