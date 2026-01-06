'use client';

const nodeTypes = [
  { type: 'Start', label: 'Start', color: 'bg-green-500' },
  { type: 'Message', label: 'Message', color: 'bg-blue-500' },
  { type: 'AskCollect', label: 'Ask/Collect', color: 'bg-yellow-500' },
  { type: 'Condition', label: 'Condition', color: 'bg-purple-500' },
  { type: 'Router', label: 'Router', color: 'bg-pink-500' },
  { type: 'ToolCall', label: 'Tool Call', color: 'bg-orange-500' },
  { type: 'AIAnswer', label: 'AI Answer', color: 'bg-indigo-500' },
  { type: 'Handoff', label: 'Handoff', color: 'bg-red-500' },
  { type: 'End', label: 'End', color: 'bg-gray-500' },
];

export function NodePalette({
  onAddNode,
}: {
  onAddNode: (type: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-3">
      <div className="text-sm font-semibold mb-2">Node Palette</div>
      <div className="space-y-1">
        {nodeTypes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => onAddNode(nodeType.type)}
            className={`w-full text-left px-3 py-2 rounded text-sm text-white ${nodeType.color} hover:opacity-80 transition-opacity`}
          >
            {nodeType.label}
          </button>
        ))}
      </div>
    </div>
  );
}

