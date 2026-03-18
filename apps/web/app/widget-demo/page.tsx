'use client';

import { useEffect } from 'react';

export default function WidgetDemoPage() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.setAttribute(
      'data-api-url',
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    );
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-theme-primary', '#007bff');
    script.setAttribute('data-chat-title', 'FlowBot Support');
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const widgetScript = document.querySelector('script[src="/widget.js"]');
      if (widgetScript) {
        widgetScript.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">FlowBot Widget Demo</h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates the embeddable FlowBot chat widget. Click the chat button in the
          bottom-right corner to start a conversation.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Embedding the Widget</h2>
          <p className="mb-4">To embed the FlowBot widget in your website, add this script tag:</p>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{`<script
  src="https://your-cdn.com/widget.js"
  data-api-url="https://api.yourdomain.com"
  data-bot-id="your-bot-id"
  data-position="bottom-right"
  data-theme-primary="#007bff"
  data-chat-title="Chat with us"
></script>`}</code>
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Configuration Options</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>data-api-url</strong> (required): URL of the FlowBot API server
            </li>
            <li>
              <strong>data-bot-id</strong>: ID of the bot to connect to (optional if channel is
              configured)
            </li>
            <li>
              <strong>data-channel-id</strong>: ID of the channel connection (optional)
            </li>
            <li>
              <strong>data-position</strong>: Widget position - &apos;bottom-right&apos;,
              &apos;bottom-left&apos;, &apos;top-right&apos;, or &apos;top-left&apos; (default:
              &apos;bottom-right&apos;)
            </li>
            <li>
              <strong>data-theme-primary</strong>: Primary color for the widget theme (default:
              &apos;#007bff&apos;)
            </li>
            <li>
              <strong>data-chat-title</strong>: Title displayed in the chat window header (default:
              &apos;Chat&apos;)
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Programmatic API</h2>
          <p className="mb-4">
            You can also control the widget programmatically after it&apos;s loaded:
          </p>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{`// Open the widget
window.FlowBotWidget?.open();

// Close the widget
window.FlowBotWidget?.close();

// Listen to events
window.FlowBotWidget?.on('message', (data) => {
  console.log('New message:', data);
});

window.FlowBotWidget?.on('open', () => {
  console.log('Widget opened');
});

window.FlowBotWidget?.on('close', () => {
  console.log('Widget closed');
});`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
