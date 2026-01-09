import type { WidgetMessage } from './types';

export class WidgetAPI {
  constructor(
    private apiUrl: string,
    private channelId?: string
  ) {}

  async sendMessage(
    userId: string,
    text: string,
    sessionId?: string,
    messageId?: string
  ): Promise<{ messages: WidgetMessage[]; sessionId: string }> {
    const url = `${this.apiUrl}/webhooks/channel/web`;

    const payload: any = {
      userId,
      messageId: messageId || `web-${Date.now()}-${Math.random()}`,
      text,
      type: 'text',
      timestamp: new Date().toISOString(),
    };

    if (this.channelId) {
      payload.channelId = this.channelId;
    }

    if (sessionId) {
      payload.sessionId = sessionId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        messages: data.messages || [],
        sessionId: data.sessionId || sessionId || '',
      };
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}
