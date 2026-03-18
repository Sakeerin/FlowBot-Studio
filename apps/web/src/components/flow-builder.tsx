'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
} from 'reactflow';
import { apiClient } from '@/lib/api-client';
import { FlowGraphDto } from '@flowbot/shared';
import { NodePalette } from './node-palette';
import { NodeConfigPanel } from './node-config-panel';

const nodeTypes = {
  Start: ({ data }: any) => (
    <div className="px-4 py-2 bg-green-500 text-white rounded shadow">{data.label || 'Start'}</div>
  ),
  Message: ({ data }: any) => (
    <div className="px-4 py-2 bg-blue-500 text-white rounded shadow">{data.label || 'Message'}</div>
  ),
  AskCollect: ({ data }: any) => (
    <div className="px-4 py-2 bg-yellow-500 text-white rounded shadow">{data.label || 'Ask'}</div>
  ),
  Condition: ({ data }: any) => (
    <div className="px-4 py-2 bg-purple-500 text-white rounded shadow">
      {data.label || 'Condition'}
    </div>
  ),
  Router: ({ data }: any) => (
    <div className="px-4 py-2 bg-pink-500 text-white rounded shadow">{data.label || 'Router'}</div>
  ),
  ToolCall: ({ data }: any) => (
    <div className="px-4 py-2 bg-orange-500 text-white rounded shadow">{data.label || 'Tool'}</div>
  ),
  AIAnswer: ({ data }: any) => (
    <div className="px-4 py-2 bg-indigo-500 text-white rounded shadow">{data.label || 'AI'}</div>
  ),
  Handoff: ({ data }: any) => (
    <div className="px-4 py-2 bg-red-500 text-white rounded shadow">{data.label || 'Handoff'}</div>
  ),
  End: ({ data }: any) => (
    <div className="px-4 py-2 bg-gray-500 text-white rounded shadow">{data.label || 'End'}</div>
  ),
};

export function FlowBuilder({ botId }: { botId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadFlow = async () => {
      try {
        const flow = await apiClient.getDraftFlow(botId);
        if (!cancelled && flow.nodes && flow.edges) {
          setNodes(flow.nodes as Node[]);
          setEdges(flow.edges as Edge[]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load flow:', err);
        }
      }
    };
    loadFlow();
    return () => {
      cancelled = true;
    };
  }, [botId, setNodes, setEdges]);

  const saveFlow = useCallback(
    async (showErrors = true) => {
      setSaving(true);
      try {
        const flowGraph: FlowGraphDto = {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as any,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined,
            type: e.type || 'default',
            label: e.label || undefined,
          })),
          variables: {},
        };

        await apiClient.saveDraftFlow(botId, flowGraph);
        setValidationErrors([]);
      } catch (err: any) {
        if (err.response?.data?.errors) {
          setValidationErrors(err.response.data.errors);
          if (showErrors) {
            alert(
              'Validation errors: ' + err.response.data.errors.map((e: any) => e.message).join(', ')
            );
          }
        } else {
          console.error('Failed to save flow:', err);
        }
      } finally {
        setSaving(false);
      }
    },
    [botId, nodes, edges]
  );

  // Autosave on changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const timer = setTimeout(() => {
        saveFlow(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, saveFlow]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `edge-${Date.now()}`,
            type: 'default',
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position: {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        data: {
          label: type,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
      }
    },
    [setNodes, selectedNode]
  );

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-left">
          <NodePalette onAddNode={addNode} />
        </Panel>
        {validationErrors.length > 0 && (
          <Panel position="top-right">
            <div className="bg-red-50 border border-red-200 rounded p-2 max-w-sm">
              <div className="text-sm font-semibold text-red-800 mb-1">Validation Errors:</div>
              {validationErrors.map((err, idx) => (
                <div key={idx} className="text-xs text-red-700">
                  {err.message}
                </div>
              ))}
            </div>
          </Panel>
        )}
        {saving && (
          <Panel position="bottom-right">
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1 text-sm text-blue-700">
              Saving...
            </div>
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l shadow-lg p-4 overflow-y-auto">
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}
