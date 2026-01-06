import { Injectable } from '@nestjs/common';
import { NodeHandler } from './node-handler.interface';
import { StartNodeHandler } from './start-node.handler';
import { MessageNodeHandler } from './message-node.handler';
import { AskCollectNodeHandler } from './ask-collect-node.handler';
import { ConditionNodeHandler } from './condition-node.handler';
import { RouterNodeHandler } from './router-node.handler';
import { ToolCallNodeHandler } from './tool-call-node.handler';
import { AiAnswerNodeHandler } from './ai-answer-node.handler';
import { HandoffNodeHandler } from './handoff-node.handler';
import { EndNodeHandler } from './end-node.handler';

@Injectable()
export class NodeHandlerRegistry {
  private handlers: Map<string, NodeHandler> = new Map();

  constructor(
    private startHandler: StartNodeHandler,
    private messageHandler: MessageNodeHandler,
    private askCollectHandler: AskCollectNodeHandler,
    private conditionHandler: ConditionNodeHandler,
    private routerHandler: RouterNodeHandler,
    private toolCallHandler: ToolCallNodeHandler,
    private aiAnswerHandler: AiAnswerNodeHandler,
    private handoffHandler: HandoffNodeHandler,
    private endHandler: EndNodeHandler
  ) {
    this.register('Start', startHandler);
    this.register('Message', messageHandler);
    this.register('AskCollect', askCollectHandler);
    this.register('Condition', conditionHandler);
    this.register('Router', routerHandler);
    this.register('ToolCall', toolCallHandler);
    this.register('AIAnswer', aiAnswerHandler);
    this.register('Handoff', handoffHandler);
    this.register('End', endHandler);
  }

  private register(type: string, handler: NodeHandler) {
    this.handlers.set(type, handler);
  }

  getHandler(type: string): NodeHandler | undefined {
    return this.handlers.get(type);
  }
}

