import type { WidgetConfig, WidgetMessage, WidgetEvent } from './types';
import { SessionManager } from './session';
import { WidgetAPI } from './api';
import { ChatUI } from './chat-ui';

export class FlowBotWidget {
  private config: WidgetConfig;
  private sessionManager: SessionManager;
  private api: WidgetAPI;
  private chatUI: ChatUI;
  private eventHandlers: Map<WidgetEvent, ((data?: any) => void)[]> = new Map();
  private userId: string;

  constructor(config: WidgetConfig) {
    if (!config.apiUrl) {
      throw new Error('apiUrl is required');
    }

    this.config = {
      position: 'bottom-right',
      theme: {
        primaryColor: '#007bff',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        buttonColor: '#007bff',
      },
      launcher: {
        text: 'Open chat',
        icon: '💬',
      },
      chat: {
        title: 'Chat',
        placeholder: 'Type a message...',
        showTimestamp: true,
      },
      ...config,
    };

    this.userId = this.config.userId || this.generateUserId();
    this.sessionManager = new SessionManager(this.userId, this.config.botId);
    this.api = new WidgetAPI(this.config.apiUrl, this.config.channelId);
    this.chatUI = new ChatUI(this.config);

    this.setupEventHandlers();
  }

  private generateUserId(): string {
    const storageKey = this.config.botId
      ? `flowbot_user_id_${this.config.botId}`
      : 'flowbot_user_id';
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return stored;
    }

    const userId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    try {
      localStorage.setItem(storageKey, userId);
    } catch (e) {
      console.warn('Failed to store user ID:', e);
    }
    return userId;
  }

  private setupEventHandlers(): void {
    this.chatUI.setOnSendMessage((text) => this.handleSendMessage(text));

    // Load existing session
    const existingSessionId = this.sessionManager.getSessionId();
    if (existingSessionId) {
      // Could load previous messages here if needed
    }
  }

  private async handleSendMessage(text: string): Promise<void> {
    try {
      // Add user message to UI immediately
      const userMessage: WidgetMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      this.chatUI.addMessage(userMessage);
      this.emit('message', { role: 'user', content: text });

      // Send to API
      const sessionId = this.sessionManager.getSessionId() || this.config.sessionId;
      const response = await this.api.sendMessage(this.userId, text, sessionId || undefined);

      // Update session ID
      if (response.sessionId) {
        this.sessionManager.setSessionId(response.sessionId);
      }

      // Add bot messages to UI
      for (const msg of response.messages) {
        const botMessage: WidgetMessage = {
          id: msg.id || `bot-${Date.now()}-${Math.random()}`,
          role: msg.role || 'bot',
          content: msg.content,
          timestamp: new Date(),
          metadata: msg.metadata,
        };
        this.chatUI.addMessage(botMessage);
        this.emit('message', { role: 'bot', content: msg.content });
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      this.emit('error', { error: error.message });

      // Show error message to user
      const errorMessage: WidgetMessage = {
        id: `error-${Date.now()}`,
        role: 'bot',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      this.chatUI.addMessage(errorMessage);
    }
  }

  on(event: WidgetEvent, handler: (data?: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: WidgetEvent, handler: (data?: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: WidgetEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  open(): void {
    this.chatUI.open();
    this.emit('open');
  }

  close(): void {
    this.chatUI.close();
    this.emit('close');
  }

  destroy(): void {
    // Clean up event handlers and DOM elements
    this.eventHandlers.clear();
    // Remove DOM elements would be handled by the ChatUI class
  }
}
