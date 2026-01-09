'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AuthGuard } from '@/components/auth-guard';

interface Ticket {
  id: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
  session: {
    id: string;
    externalUserId: string;
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
  };
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [slaStatus, setSlaStatus] = useState<any>(null);

  useEffect(() => {
    loadTicket();
    loadSLAStatus();
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadTicket();
      loadSLAStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const response = await apiClient.get(`/handoff/${ticketId}`);
      setTicket(response.data);
    } catch (error: any) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSLAStatus = async () => {
    try {
      const response = await apiClient.get(`/handoff/${ticketId}/sla`);
      setSlaStatus(response.data);
    } catch (error: any) {
      console.error('Failed to load SLA status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await apiClient.post(`/handoff/${ticketId}/message`, { content: message });
      setMessage('');
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      alert('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await apiClient.put(`/handoff/${ticketId}`, { status });
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAssign = async (assignedTo: string) => {
    try {
      await apiClient.put(`/handoff/${ticketId}`, { assignedTo, status: 'assigned' });
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to assign ticket:', error);
      alert('Failed to assign ticket: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      await apiClient.post(`/handoff/${ticketId}/notes`, { note });
      setNote('');
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to add note:', error);
      alert('Failed to add note: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddTag = async () => {
    if (!tag.trim()) return;

    try {
      await apiClient.post(`/handoff/${ticketId}/tags`, { tags: [tag] });
      setTag('');
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      await apiClient.delete(`/handoff/${ticketId}/tags/${encodeURIComponent(tagToRemove)}`);
      await loadTicket();
    } catch (error: any) {
      console.error('Failed to remove tag:', error);
      alert('Failed to remove tag: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading ticket...</div>
        </div>
      </AuthGuard>
    );
  }

  if (!ticket) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-red-500">Ticket not found</div>
        </div>
      </AuthGuard>
    );
  }

  const tags = (ticket.metadata?.tags || []) as string[];
  const notes = (ticket.metadata?.notes || []) as Array<{
    id: string;
    userId: string;
    content: string;
    createdAt: string;
  }>;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/agent/inbox')}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Back to Inbox
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Ticket {ticket.id.slice(0, 8)}...
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>User: {ticket.session.externalUserId.slice(0, 30)}...</span>
                  <span>Bot: {ticket.session.channelConnection.bot?.name || 'N/A'}</span>
                  <span>Channel: {ticket.session.channelConnection.channel}</span>
                </div>
              </div>
              {slaStatus?.isOverdue && (
                <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-2">
                  <div className="text-red-800 font-semibold">⚠️ SLA Alert</div>
                  <div className="text-sm text-red-700">
                    Unassigned for {slaStatus.ageFormatted}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Conversation</h2>
                </div>
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                  {ticket.session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-100 text-blue-900'
                            : msg.role === 'agent'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs text-gray-600 mb-1">
                          {msg.role === 'user' ? 'User' : msg.role === 'agent' ? 'Agent' : 'Bot'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      disabled={sending || ticket.status === 'closed'}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim() || ticket.status === 'closed'}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Ticket Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={ticket.priority}
                      onChange={(e) =>
                        apiClient.put(`/handoff/${ticketId}`, { priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To
                    </label>
                    <input
                      type="text"
                      placeholder="Enter user ID"
                      defaultValue={ticket.assignedTo || ''}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleAssign(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-500 mb-2">Created</div>
                    <div className="text-sm">{formatTime(ticket.createdAt)}</div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-500 mb-2">Last Updated</div>
                    <div className="text-sm">{formatTime(ticket.updatedAt)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!tag.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {notes.map((note) => (
                    <div key={note.id} className="text-sm border-l-2 border-gray-200 pl-3">
                      <div className="text-gray-600">{note.content}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatTime(note.createdAt)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={!note.trim()}
                  className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
