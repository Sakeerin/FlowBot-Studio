'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth-guard';
import { apiClient } from '@/lib/api-client';

interface Bot {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  versions: Array<{ version: number }>;
}

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await apiClient.getBots();
      setBots(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = async () => {
    const name = prompt('Enter bot name:');
    if (!name) return;

    try {
      const bot = await apiClient.createBot({ name });
      router.push(`/bots/${bot.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create bot');
    }
  };

  const handleDeleteBot = async (id: string, name: string) => {
    if (!confirm(`Delete bot "${name}"?`)) return;

    try {
      await apiClient.deleteBot(id);
      loadBots();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete bot');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">FlowBot Studio</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    localStorage.clear();
                    router.push('/login');
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bots</h2>
              <button
                onClick={handleCreateBot}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Bot
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">Loading bots...</div>
            ) : bots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No bots yet</p>
                <button
                  onClick={handleCreateBot}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create your first bot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/bots/${bot.id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {bot.name}
                      </h3>
                      {bot.description && (
                        <p className="text-sm text-gray-600 mb-4">{bot.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        Published: {bot.versions.length > 0 ? `v${bot.versions[0].version}` : 'None'}
                      </div>
                    </Link>
                    <div className="mt-4 flex space-x-2">
                      <Link
                        href={`/bots/${bot.id}`}
                        className="flex-1 text-center px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

