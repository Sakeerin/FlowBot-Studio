import { Module } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { RuntimeController } from './runtime.controller';
import { NodeHandlerRegistry } from './handlers/node-handler.registry';
import { StartNodeHandler } from './handlers/start-node.handler';
import { MessageNodeHandler } from './handlers/message-node.handler';
import { AskCollectNodeHandler } from './handlers/ask-collect-node.handler';
import { ConditionNodeHandler } from './handlers/condition-node.handler';
import { RouterNodeHandler } from './handlers/router-node.handler';
import { ToolCallNodeHandler } from './handlers/tool-call-node.handler';
import { AiAnswerNodeHandler } from './handlers/ai-answer-node.handler';
import { HandoffNodeHandler } from './handlers/handoff-node.handler';
import { EndNodeHandler } from './handlers/end-node.handler';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [GuardrailsModule, KnowledgeModule],
  controllers: [RuntimeController],
  providers: [
    RuntimeService,
    NodeHandlerRegistry,
    StartNodeHandler,
    MessageNodeHandler,
    AskCollectNodeHandler,
    ConditionNodeHandler,
    RouterNodeHandler,
    ToolCallNodeHandler,
    AiAnswerNodeHandler,
    HandoffNodeHandler,
    EndNodeHandler,
  ],
  exports: [RuntimeService],
})
export class RuntimeModule {}

