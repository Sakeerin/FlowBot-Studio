'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AuthGuard } from '@/components/auth-guard';

interface Session {
  id: string;
  externalUserId: string;
  createdAt: string;
  updatedAt: string;
  channelConnection: {
    channel: string;
    bot?: {
      id: string;
      name: string;
    };
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    metadata?: any;
  }>;
  traceSpans: Array<{
    id: string;
    nodeId?: string;
    action: string;
    input?: any;
    output?: any;
    latency?: number;
    error?: string;
    createdAt: string;
  }>;
  handoffTickets: Array<{
    id: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
}

export default function SessionTracePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'trace'>('messages');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const data = await apiClient.getSessionTrace(sessionId);
      setSession(data);
    } catch (error: any) {
      console.error('Failed to load session trace:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading session trace...</div>
        </div>
      </AuthGuard>
    );
  }

  if (!session) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-red-500">Session not found</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/analytics/logs')}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Back to Logs
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Session Trace - {session.id.slice(0, 8)}...
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>User: {session.externalUserId.slice(0, 30)}...</span>
                <span>Bot: {session.channelConnection.bot?.name || 'N/A'}</span>
                <span>Channel: {session.channelConnection.channel}</span>
                <span>Started: {formatTime(session.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'messages'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Messages ({session.messages.length})
                </button>
                <button
                  onClick={() => setActiveTab('trace')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'trace'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Trace ({session.traceSpans.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'messages' && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-2xl px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-100 text-blue-900'
                            : msg.role === 'agent'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold">
                            {msg.role === 'user' ? 'User' : msg.role === 'agent' ? 'Agent' : 'Bot'}
                          </div>
                          <div className="text-xs text-gray-600">{formatTime(msg.createdAt)}</div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-gray-600">Metadata</summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                              {JSON.stringify(msg.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'trace' && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {session.traceSpans.map((span, idx) => (
                    <div
                      key={span.id || idx}
                      className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">{span.action}</div>
                        <div className="text-xs text-gray-500">
                          {span.latency ? `${span.latency}ms` : '-'}
                        </div>
                      </div>
                      {span.nodeId && (
                        <div className="text-xs text-gray-600 mb-1">Node: {span.nodeId}</div>
                      )}
                      {span.error && (
                        <div className="text-xs text-red-600 mb-1">Error: {span.error}</div>
                      )}
                      {span.input && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-gray-600">Input</summary>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(span.input, null, 2)}
                          </pre>
                        </details>
                      )}
                      {span.output && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-gray-600">Output</summary>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(span.output, null, 2)}
                          </pre>
                        </details>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{formatTime(span.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {session.handoffTickets.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Handoff Tickets</h2>
              <div className="space-y-2">
                {session.handoffTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">Ticket {ticket.id.slice(0, 8)}...</div>
                      <div className="text-xs text-gray-500">
                        {ticket.status} • {ticket.priority} • {formatTime(ticket.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/agent/inbox/${ticket.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
