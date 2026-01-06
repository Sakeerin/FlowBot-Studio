import { Injectable, NotFoundException } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ToolCallNodeHandler implements NodeHandler {
  constructor(private prisma: PrismaService) {}

  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any
  ): Promise<NodeHandlerResult> {
    const toolId = node.data.toolId;
    const inputMapping = node.data.inputMapping || {};
    const outputMapping = node.data.outputMapping || {};

    // Load tool
    const tool = await this.prisma.tool.findUnique({
      where: { id: toolId },
      include: { secrets: true },
    });

    if (!tool || !tool.isActive) {
      throw new NotFoundException(`Tool ${toolId} not found or inactive`);
    }

    // Map input variables to tool parameters
    const toolInput: Record<string, any> = {};
    for (const [toolParam, varName] of Object.entries(inputMapping)) {
      toolInput[toolParam] = variables[varName as string];
    }

    // Execute tool (stub for MVP - HTTP tool execution will be implemented later)
    let toolOutput: any = {};
    let error: string | undefined;

    try {
      if (tool.type === 'http') {
        toolOutput = await this.executeHttpTool(tool, toolInput);
      } else {
        throw new Error(`Tool type ${tool.type} not supported`);
      }
    } catch (e: any) {
      error = e.message;
    }

    // Map tool output to variables
    const variableUpdates: Record<string, any> = {};
    if (!error && outputMapping) {
      for (const [varName, outputPath] of Object.entries(outputMapping)) {
        // Simple JSONPath-like access (e.g., "response.data.value")
        const value = this.getNestedValue(toolOutput, outputPath as string);
        if (value !== undefined) {
          variableUpdates[varName] = value;
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

  private async executeHttpTool(tool: any, input: Record<string, any>): Promise<any> {
    // Stub implementation - will be fully implemented in Step 7
    // For MVP, return mock response
    return {
      status: 'success',
      data: input,
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

