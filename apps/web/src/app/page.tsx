'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        router.push('/bots');
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">FlowBot Studio</h1>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </main>
  );
}

