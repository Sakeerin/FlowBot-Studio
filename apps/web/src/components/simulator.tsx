'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function Simulator({ botId }: { botId: string }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      const response = await apiClient.simulate(botId, message);
      if (response.messages) {
        setMessages((prev) => [
          ...prev,
          ...response.messages.map((msg: any) => ({ role: 'bot', content: msg.content })),
        ]);
      }
      setMessage('');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'Error: ' + (err.response?.data?.message || 'Failed to simulate'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Simulator</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">{msg.role}</div>
            <div className="text-sm">{msg.content}</div>
          </div>
        ))}
        {loading && <div className="text-center text-gray-500 text-sm">Processing...</div>}
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
