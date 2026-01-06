'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { apiClient } from '@/lib/api-client';
import { FlowBuilder } from '@/components/flow-builder';
import { Simulator } from '@/components/simulator';

export default function BotEditorPage() {
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBot();
  }, [botId]);

  const loadBot = async () => {
    try {
      const data = await apiClient.getBot(botId);
      setBot(data);
    } catch (err) {
      console.error('Failed to load bot:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col bg-gray-50">
        <nav className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/bots')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-bold">
                  {bot?.name || 'Loading...'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={async () => {
                    if (!confirm('Publish this bot version?')) return;
                    try {
                      await apiClient.publishBot(botId, {});
                      alert('Bot published successfully!');
                    } catch (err: any) {
                      alert(
                        err.response?.data?.message ||
                          'Failed to publish bot'
                      );
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Publish
                </button>
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

        <div className="flex-1 flex">
          <div className="flex-1">
            <FlowBuilder botId={botId} />
          </div>
          <div className="w-96 bg-white border-l">
            <Simulator botId={botId} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

