import type { WidgetConfig, WidgetMessage } from './types';

export class ChatUI {
  private container: HTMLElement | null = null;
  private launcher: HTMLElement | null = null;
  private chatWindow: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputContainer: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private sendButton: HTMLElement | null = null;
  private isOpen = false;
  private config: WidgetConfig;
  private onSendMessage?: (text: string) => void;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.init();
  }

  private init(): void {
    this.createStyles();
    this.createLauncher();
    this.createChatWindow();
  }

  private createStyles(): void {
    if (document.getElementById('flowbot-widget-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'flowbot-widget-styles';
    style.textContent = `
      .flowbot-widget-launcher {
        position: fixed;
        ${this.getPosition()}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${this.config.theme?.primaryColor || '#007bff'};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: transform 0.2s;
      }
      
      .flowbot-widget-launcher:hover {
        transform: scale(1.1);
      }
      
      .flowbot-widget-chat {
        position: fixed;
        ${this.getPosition()}
        bottom: 80px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 100px);
        background-color: ${this.config.theme?.backgroundColor || '#ffffff'};
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 9998;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        ${this.config.position?.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      }
      
      .flowbot-widget-chat.hidden {
        display: none;
      }
      
      .flowbot-widget-header {
        background-color: ${this.config.theme?.primaryColor || '#007bff'};
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .flowbot-widget-title {
        font-weight: 600;
        font-size: 16px;
      }
      
      .flowbot-widget-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .flowbot-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .flowbot-widget-message {
        display: flex;
        flex-direction: column;
        max-width: 80%;
      }
      
      .flowbot-widget-message.user {
        align-self: flex-end;
      }
      
      .flowbot-widget-message.bot {
        align-self: flex-start;
      }
      
      .flowbot-widget-message-content {
        padding: 10px 14px;
        border-radius: 12px;
        word-wrap: break-word;
        color: ${this.config.theme?.textColor || '#333333'};
      }
      
      .flowbot-widget-message.user .flowbot-widget-message-content {
        background-color: ${this.config.theme?.primaryColor || '#007bff'};
        color: white;
      }
      
      .flowbot-widget-message.bot .flowbot-widget-message-content {
        background-color: #f0f0f0;
        color: ${this.config.theme?.textColor || '#333333'};
      }
      
      .flowbot-widget-message-time {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
        padding: 0 4px;
      }
      
      .flowbot-widget-input-container {
        padding: 12px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 8px;
      }
      
      .flowbot-widget-input {
        flex: 1;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
      }
      
      .flowbot-widget-input:focus {
        border-color: ${this.config.theme?.primaryColor || '#007bff'};
      }
      
      .flowbot-widget-send {
        background-color: ${this.config.theme?.primaryColor || '#007bff'};
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      
      .flowbot-widget-send:hover {
        opacity: 0.9;
      }
      
      .flowbot-widget-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  private getPosition(): string {
    const position = this.config.position || 'bottom-right';
    switch (position) {
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      default:
        return 'bottom: 20px; right: 20px;';
    }
  }

  private createLauncher(): void {
    this.launcher = document.createElement('button');
    this.launcher.className = 'flowbot-widget-launcher';
    this.launcher.textContent = this.config.launcher?.icon || '💬';
    this.launcher.setAttribute('aria-label', this.config.launcher?.text || 'Open chat');
    this.launcher.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.launcher);
  }

  private createChatWindow(): void {
    this.chatWindow = document.createElement('div');
    this.chatWindow.className = 'flowbot-widget-chat hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'flowbot-widget-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'flowbot-widget-title';
    titleEl.textContent = this.config.chat?.title || 'Chat';
    header.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'flowbot-widget-close';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.textContent = '×';
    header.appendChild(closeBtn);
    closeBtn.addEventListener('click', () => this.close());
    this.chatWindow.appendChild(header);

    // Messages container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'flowbot-widget-messages';
    this.chatWindow.appendChild(this.messagesContainer);

    // Input container
    this.inputContainer = document.createElement('div');
    this.inputContainer.className = 'flowbot-widget-input-container';

    this.input = document.createElement('input');
    this.input.className = 'flowbot-widget-input';
    this.input.type = 'text';
    this.input.placeholder = this.config.chat?.placeholder || 'Type a message...';
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton = document.createElement('button');
    this.sendButton.className = 'flowbot-widget-send';
    this.sendButton.textContent = '➤';
    this.sendButton.setAttribute('aria-label', 'Send message');
    this.sendButton.addEventListener('click', () => this.sendMessage());

    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);
    this.chatWindow.appendChild(this.inputContainer);

    document.body.appendChild(this.chatWindow);
  }

  private sendMessage(): void {
    if (!this.input || !this.input.value.trim()) {
      return;
    }

    const text = this.input.value.trim();
    this.input.value = '';

    if (this.onSendMessage) {
      this.onSendMessage(text);
    }
  }

  setOnSendMessage(handler: (text: string) => void): void {
    this.onSendMessage = handler;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.chatWindow) {
      this.chatWindow.classList.remove('hidden');
      this.isOpen = true;
      if (this.input) {
        this.input.focus();
      }
    }
  }

  close(): void {
    if (this.chatWindow) {
      this.chatWindow.classList.add('hidden');
      this.isOpen = false;
    }
  }

  addMessage(message: WidgetMessage): void {
    if (!this.messagesContainer) {
      return;
    }

    const messageEl = document.createElement('div');
    messageEl.className = `flowbot-widget-message ${message.role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'flowbot-widget-message-content';
    contentEl.textContent = message.content;
    messageEl.appendChild(contentEl);

    if (this.config.chat?.showTimestamp !== false) {
      const timeEl = document.createElement('div');
      timeEl.className = 'flowbot-widget-message-time';
      timeEl.textContent = this.formatTime(message.timestamp);
      messageEl.appendChild(timeEl);
    }

    this.messagesContainer.appendChild(messageEl);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  clearMessages(): void {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
