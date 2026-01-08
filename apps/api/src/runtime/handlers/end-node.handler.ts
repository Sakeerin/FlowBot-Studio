import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class EndNodeHandler implements NodeHandler {
  async execute(
    _node: any,
    _variables: Record<string, any>,
    _inboundPayload: RuntimeInboundMessagePayload,
    _flowGraph: any,
    _tenantId?: string,
    _botId?: string
  ): Promise<NodeHandlerResult> {
    // End node terminates the flow
    return {
      nextNodeId: null,
    };
  }
}
