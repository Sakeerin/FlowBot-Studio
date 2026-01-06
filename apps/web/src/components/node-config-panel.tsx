'use client';

import { Node } from 'reactflow';
import { useState, useEffect } from 'react';

export function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: Node;
  onUpdate: (data: any) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState(node.data);

  useEffect(() => {
    setConfig(node.data);
  }, [node]);

  const handleSave = () => {
    onUpdate(config);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Node Config</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={config.label || ''}
            onChange={(e) => setConfig({ ...config, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {node.type === 'Message' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={config.content || ''}
                onChange={(e) =>
                  setConfig({ ...config, content: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <select
                value={config.format || 'text'}
                onChange={(e) =>
                  setConfig({ ...config, format: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>
          </>
        )}

        {node.type === 'AskCollect' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt
              </label>
              <textarea
                value={config.prompt || ''}
                onChange={(e) =>
                  setConfig({ ...config, prompt: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variable Name
              </label>
              <input
                type="text"
                value={config.variableName || ''}
                onChange={(e) =>
                  setConfig({ ...config, variableName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variable Type
              </label>
              <select
                value={config.variableType || 'string'}
                onChange={(e) =>
                  setConfig({ ...config, variableType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </>
        )}

        {node.type === 'Router' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intent Keyword
            </label>
            <input
              type="text"
              value={config.intentKeyword || ''}
              onChange={(e) =>
                setConfig({ ...config, intentKeyword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        )}

        {node.type === 'Condition' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operator
            </label>
            <select
              value={config.operator || 'AND'}
              onChange={(e) =>
                setConfig({ ...config, operator: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
        )}

        {node.type === 'Handoff' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={config.message || ''}
                onChange={(e) =>
                  setConfig({ ...config, message: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={config.priority || 'normal'}
                onChange={(e) =>
                  setConfig({ ...config, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

