import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class ConditionNodeHandler implements NodeHandler {
  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any
  ): Promise<NodeHandlerResult> {
    const conditions = node.data.conditions || [];
    const operator = node.data.operator || 'AND';

    let result: boolean;

    if (operator === 'AND') {
      result = conditions.every((cond: any) =>
        this.evaluateCondition(cond, variables)
      );
    } else {
      result = conditions.some((cond: any) =>
        this.evaluateCondition(cond, variables)
      );
    }

    // Find edge that matches the condition result
    const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
    
    // Look for edge with condition matching the result
    let nextNodeId: string | null = null;
    
    for (const edge of edges) {
      if (edge.condition) {
        const edgeResult = this.evaluateCondition(edge.condition, variables);
        if (edgeResult === result) {
          nextNodeId = edge.target;
          break;
        }
      }
    }

    // If no matching edge found, use first edge as default
    if (!nextNodeId && edges.length > 0) {
      nextNodeId = edges[0].target;
    }

    return {
      nextNodeId,
      traceSpans: [
        {
          action: 'condition.evaluate',
          input: { conditions, operator, variables },
          output: { result },
        },
      ],
    };
  }

  private evaluateCondition(condition: any, variables: Record<string, any>): boolean {
    const value = variables[condition.variable];
    const operator = condition.operator;
    const expectedValue = condition.value;

    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'notEquals':
        return value !== expectedValue;
      case 'greaterThan':
        return Number(value) > Number(expectedValue);
      case 'lessThan':
        return Number(value) < Number(expectedValue);
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }
}

