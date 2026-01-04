import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowBot Studio',
  description: 'Multi-tenant no-code chatbot builder + runtime platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

