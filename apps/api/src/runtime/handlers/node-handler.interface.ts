import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

export interface NodeHandlerResult {
  outgoingMessages?: Array<{
    type: string;
    content: string;
    metadata?: any;
  }>;
  nextNodeId?: string | null;
  variableUpdates?: Record<string, any>;
  traceSpans?: Array<{
    action: string;
    input?: any;
    output?: any;
  }>;
}

export interface NodeHandler {
  execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any
  ): Promise<NodeHandlerResult>;
}

