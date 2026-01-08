import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolsService } from '../../tools/tools.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonpath = require('jsonpath');

@Injectable()
export class ToolCallNodeHandler implements NodeHandler {
  constructor(
    private prisma: PrismaService,
    private toolsService: ToolsService
  ) {}

  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any,
    tenantId?: string,
    botId?: string
  ): Promise<NodeHandlerResult> {
    const toolId = node.data.toolId;
    const inputMapping = node.data.inputMapping || {};
    const outputMapping = node.data.outputMapping || {};

    // Load tool
    const tool = await this.prisma.tool.findFirst({
      where: {
        id: toolId,
        ...(tenantId && { tenantId }),
      },
      include: { secrets: true },
    });

    if (!tool || !tool.isActive) {
      throw new NotFoundException(`Tool ${toolId} not found or inactive`);
    }

    // Validate tool permission if botId is provided
    if (tenantId && botId) {
      const hasPermission = await this.toolsService.validateToolPermission(tenantId, botId, toolId);

      if (!hasPermission) {
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            actorId: 'system',
            action: 'tool.call.denied',
            targetType: 'Tool',
            targetId: toolId,
            metadata: {
              botId,
              reason: 'Tool not in bot allowed list',
            },
          },
        });

        throw new BadRequestException(`Tool ${toolId} is not allowed for this bot`);
      }
    }

    // Map input variables to tool parameters
    const toolInput: Record<string, any> = {};
    for (const [toolParam, varName] of Object.entries(inputMapping)) {
      const value = variables[varName as string];
      if (value !== undefined) {
        toolInput[toolParam] = value;
      }
    }

    // Execute tool
    let toolOutput: any = {};
    let error: string | undefined;

    try {
      if (tenantId) {
        toolOutput = await this.toolsService.execute(tenantId, toolId, toolInput);
      } else {
        // Fallback for backward compatibility
        throw new Error('Tenant ID required for tool execution');
      }
    } catch (e: any) {
      error = e.message;
    }

    // Map tool output to variables using JSONPath
    const variableUpdates: Record<string, any> = {};
    if (!error && outputMapping && toolOutput) {
      for (const [varName, jsonPath] of Object.entries(outputMapping)) {
        try {
          // Support both simple dot notation and JSONPath syntax
          let value: any;
          if (typeof jsonPath === 'string' && jsonPath.startsWith('$')) {
            // JSONPath syntax
            const results = jsonpath.query(toolOutput, jsonPath);
            value = results.length > 0 ? results[0] : undefined;
          } else {
            // Simple dot notation (e.g., "data.value")
            value = this.getNestedValue(toolOutput, jsonPath as string);
          }

          if (value !== undefined) {
            variableUpdates[varName] = value;
          }
        } catch (e: any) {
          // Ignore mapping errors for individual fields
          console.warn(`Failed to map ${varName} from ${jsonPath}:`, e.message);
        }
      }
    }

    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    const nextNodeId = edges.length > 0 ? edges[0].target : null;

    return {
      nextNodeId,
      variableUpdates,
      traceSpans: [
        {
          action: 'tool.call',
          input: { toolId, toolInput },
          output: error ? { error } : toolOutput,
        },
      ],
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
