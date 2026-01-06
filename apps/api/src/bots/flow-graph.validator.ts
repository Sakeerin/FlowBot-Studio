import { Injectable } from '@nestjs/common';
import { FlowGraphDto, Node, Edge } from '@shared/schemas/flow';

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

@Injectable()
export class FlowGraphValidator {
  validate(flowGraph: FlowGraphDto): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Must have Start node
    const startNodes = flowGraph.nodes.filter((n) => n.type === 'Start');
    if (startNodes.length === 0) {
      errors.push({
        code: 'MISSING_START_NODE',
        message: 'Flow graph must have at least one Start node',
      });
    } else if (startNodes.length > 1) {
      errors.push({
        code: 'MULTIPLE_START_NODES',
        message: 'Flow graph must have exactly one Start node',
      });
    }

    // 2. Check for unreachable nodes
    const reachableNodes = this.findReachableNodes(flowGraph);
    const unreachableNodes = flowGraph.nodes.filter(
      (n) => !reachableNodes.has(n.id)
    );
    unreachableNodes.forEach((node) => {
      errors.push({
        code: 'UNREACHABLE_NODE',
        message: `Node "${node.data.label}" (${node.id}) is unreachable from Start node`,
        nodeId: node.id,
      });
    });

    // 3. Check for nodes with missing config
    flowGraph.nodes.forEach((node) => {
      const configError = this.validateNodeConfig(node);
      if (configError) {
        errors.push(configError);
      }
    });

    // 4. Detect cycles (unless guarded by condition)
    const cycles = this.detectCycles(flowGraph);
    cycles.forEach((cycle) => {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `Cycle detected: ${cycle.join(' -> ')}`,
        nodeId: cycle[0],
      });
    });

    // 5. Check for edges pointing to non-existent nodes
    const nodeIds = new Set(flowGraph.nodes.map((n) => n.id));
    flowGraph.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          code: 'INVALID_EDGE_SOURCE',
          message: `Edge ${edge.id} references non-existent source node ${edge.source}`,
          edgeId: edge.id,
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          code: 'INVALID_EDGE_TARGET',
          message: `Edge ${edge.id} references non-existent target node ${edge.target}`,
          edgeId: edge.id,
        });
      }
    });

    return errors;
  }

  private findReachableNodes(flowGraph: FlowGraphDto): Set<string> {
    const reachable = new Set<string>();
    const startNode = flowGraph.nodes.find((n) => n.type === 'Start');

    if (!startNode) {
      return reachable;
    }

    const visited = new Set<string>();
    const queue = [startNode.id];
    visited.add(startNode.id);
    reachable.add(startNode.id);

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const outgoingEdges = flowGraph.edges.filter(
        (e) => e.source === currentNodeId
      );

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return reachable;
  }

  private validateNodeConfig(node: Node): ValidationError | null {
    switch (node.type) {
      case 'Message':
        if (!node.data.content || node.data.content.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `Message node "${node.data.label}" is missing content`,
            nodeId: node.id,
          };
        }
        break;

      case 'AskCollect':
        if (!node.data.prompt || node.data.prompt.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `AskCollect node "${node.data.label}" is missing prompt`,
            nodeId: node.id,
          };
        }
        if (!node.data.variableName || node.data.variableName.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `AskCollect node "${node.data.label}" is missing variable name`,
            nodeId: node.id,
          };
        }
        break;

      case 'Condition':
        if (!node.data.conditions || node.data.conditions.length === 0) {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `Condition node "${node.data.label}" is missing conditions`,
            nodeId: node.id,
          };
        }
        break;

      case 'Router':
        if (!node.data.intentKeyword || node.data.intentKeyword.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `Router node "${node.data.label}" is missing intent keyword`,
            nodeId: node.id,
          };
        }
        break;

      case 'ToolCall':
        if (!node.data.toolId || node.data.toolId.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `ToolCall node "${node.data.label}" is missing tool ID`,
            nodeId: node.id,
          };
        }
        break;

      case 'AIAnswer':
        if (!node.data.prompt || node.data.prompt.trim() === '') {
          return {
            code: 'MISSING_NODE_CONFIG',
            message: `AIAnswer node "${node.data.label}" is missing prompt`,
            nodeId: node.id,
          };
        }
        break;
    }

    return null;
  }

  private detectCycles(flowGraph: FlowGraphDto): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const outgoingEdges = flowGraph.edges.filter((e) => e.source === nodeId);

      for (const edge of outgoingEdges) {
        // Skip if edge has a condition (guarded cycle is allowed)
        if (edge.condition) {
          continue;
        }

        if (!visited.has(edge.target)) {
          dfs(edge.target, [...path]);
        } else if (recStack.has(edge.target)) {
          // Cycle detected
          const cycleStart = path.indexOf(edge.target);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), edge.target]);
          }
        }
      }

      recStack.delete(nodeId);
    };

    for (const node of flowGraph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return cycles;
  }
}

