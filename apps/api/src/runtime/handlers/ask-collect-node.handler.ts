import { Injectable } from '@nestjs/common';
import { NodeHandler, NodeHandlerResult } from './node-handler.interface';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Injectable()
export class AskCollectNodeHandler implements NodeHandler {
  async execute(
    node: any,
    variables: Record<string, any>,
    inboundPayload: RuntimeInboundMessagePayload,
    flowGraph: any,
    _tenantId?: string,
    _botId?: string
  ): Promise<NodeHandlerResult> {
    const variableName = node.data.variableName;
    const prompt = node.data.prompt || 'Please provide input:';

    // Check if variable already collected
    if (variables[variableName] !== undefined) {
      // Variable already collected, move to next node
      const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
      const nextNodeId = edges.length > 0 ? edges[0].target : null;

      return {
        nextNodeId,
      };
    }

    // Check if we have input from the user
    if (inboundPayload.text) {
      // Validate and collect the input
      const value = this.validateAndCollect(
        inboundPayload.text,
        node.data.variableType || 'string',
        node.data.validation
      );

      const edges = flowGraph.edges.filter((e: any) => e.source === node.id);
      const nextNodeId = edges.length > 0 ? edges[0].target : null;

      return {
        variableUpdates: {
          [variableName]: value,
        },
        nextNodeId,
      };
    }

    // No input yet, ask for it
    return {
      outgoingMessages: [
        {
          type: 'text',
          content: prompt,
          metadata: {
            waitingForInput: variableName,
            variableType: node.data.variableType || 'string',
          },
        },
      ],
      // Stay on this node until input is collected
      nextNodeId: node.id,
    };
  }

  private validateAndCollect(input: string, type: string, validation?: any): any {
    let value: any = input;

    // Type conversion
    switch (type) {
      case 'number':
        value = parseFloat(input);
        if (isNaN(value)) {
          throw new Error('Invalid number format');
        }
        break;
      case 'boolean':
        value = input.toLowerCase() === 'true' || input === '1';
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          throw new Error('Invalid email format');
        }
        value = input;
        break;
      case 'phone':
        // Basic phone validation
        if (!/^[\d\s\-+()]+$/.test(input)) {
          throw new Error('Invalid phone format');
        }
        value = input;
        break;
      default:
        value = input;
    }

    // Additional validation
    if (validation) {
      if (validation.required && (!value || value === '')) {
        throw new Error('This field is required');
      }
      if (validation.minLength && String(value).length < validation.minLength) {
        throw new Error(`Minimum length is ${validation.minLength} characters`);
      }
      if (validation.maxLength && String(value).length > validation.maxLength) {
        throw new Error(`Maximum length is ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
        throw new Error('Invalid format');
      }
    }

    return value;
  }
}
