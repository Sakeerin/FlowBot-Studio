'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AuthGuard } from '@/components/auth-guard';

interface Ticket {
  id: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  session: {
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
    }>;
  };
  metadata?: any;
}

export default function AgentInboxPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    search: '',
  });
  const [slaAlerts, setSlaAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadTickets();
    loadSLAAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadTickets();
      loadSLAAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters]);

  const loadTickets = async () => {
    try {
      const response = await apiClient.get('/handoff', { params: filters });
      setTickets(response.data || []);
    } catch (error: any) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSLAAlerts = async () => {
    try {
      const response = await apiClient.get('/handoff/alerts');
      setSlaAlerts(response.data || []);
    } catch (error: any) {
      console.error('Failed to load SLA alerts:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }

    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        filtered = filtered.filter((t) => !t.assignedTo);
      } else {
        filtered = filtered.filter((t) => t.assignedTo === filters.assignedTo);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.session.externalUserId.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower) ||
          t.session.messages.some((m) => m.content.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTickets(filtered);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Desk - Inbox</h1>
            <p className="text-gray-600">Manage customer handoff tickets</p>
          </div>

          {slaAlerts.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                SLA Alerts ({slaAlerts.length})
              </h2>
              <div className="space-y-2">
                {slaAlerts.map((alert) => (
                  <div
                    key={alert.ticketId}
                    className="text-sm text-red-700 flex items-center justify-between"
                  >
                    <span>
                      Ticket {alert.ticketId} unassigned for {alert.ageFormatted}
                    </span>
                    <button
                      onClick={() => router.push(`/agent/inbox/${alert.ticketId}`)}
                      className="text-red-800 hover:underline font-medium"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search tickets..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading tickets...</div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No tickets found</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bot/Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => {
                    const lastMessage = ticket.session.messages[ticket.session.messages.length - 1];
                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/agent/inbox/${ticket.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.id.slice(0, 8)}...
                          </div>
                          {lastMessage && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {lastMessage.content.substring(0, 60)}
                              {lastMessage.content.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {ticket.session.externalUserId.slice(0, 20)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {ticket.session.channelConnection.bot?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ticket.session.channelConnection.channel}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ticket.assignedTo || <span className="text-yellow-600">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(ticket.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
