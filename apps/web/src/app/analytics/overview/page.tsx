'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuthGuard } from '@/components/auth-guard';

interface OverviewMetrics {
  sessionsCount: number;
  messagesCount: number;
  fallbackRate: number;
  handoffRate: number;
  toolErrorRate: number;
  kbHitRate: number;
  avgResponseTime: number;
  toolCallCount: number;
  toolErrorCount: number;
  kbHitCount: number;
  handoffCount: number;
  fallbackCount: number;
}

interface DailyRollup {
  date: string;
  sessionsCount: number;
  messagesCount: number;
  fallbackRate: number;
  handoffRate: number;
  toolErrorRate: number;
  kbHitRate: number;
  avgResponseTime: number;
}

export default function AnalyticsOverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [rollups, setRollups] = useState<DailyRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadMetrics();
    loadRollups();
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      const response = await apiClient.get('/analytics/overview', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setMetrics(response.data);
    } catch (error: any) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRollups = async () => {
    try {
      const response = await apiClient.get('/analytics/rollups', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setRollups(response.data || []);
    } catch (error: any) {
      console.error('Failed to load rollups:', error);
    }
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  if (loading || !metrics) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading analytics...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Overview</h1>
            <p className="text-gray-600">Key metrics and insights</p>
          </div>

          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Sessions</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.sessionsCount)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Messages</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.messagesCount)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Avg Response Time</div>
              <div className="text-3xl font-bold text-gray-900">{metrics.avgResponseTime}ms</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Handoffs</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.handoffCount)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Rate: {formatPercent(metrics.handoffRate)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Fallback Rate</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPercent(metrics.fallbackRate)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatNumber(metrics.fallbackCount)} fallbacks
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">KB Hit Rate</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPercent(metrics.kbHitRate)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatNumber(metrics.kbHitCount)} hits
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Tool Error Rate</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPercent(metrics.toolErrorRate)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatNumber(metrics.toolErrorCount)} / {formatNumber(metrics.toolCallCount)} calls
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Tool Calls</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.toolCallCount)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatNumber(metrics.toolErrorCount)} errors
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Rollups</h2>
            {rollups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fallback Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Handoff Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        KB Hit Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tool Error Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Response (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rollups.map((rollup) => (
                      <tr key={rollup.date}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(rollup.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(rollup.sessionsCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(rollup.messagesCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPercent(rollup.fallbackRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPercent(rollup.handoffRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPercent(rollup.kbHitRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPercent(rollup.toolErrorRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(rollup.avgResponseTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
