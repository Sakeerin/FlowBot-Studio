export interface WidgetConfig {
  apiUrl: string;
  botId?: string;
  channelId?: string;
  userId?: string;
  sessionId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
  };
  launcher?: {
    text?: string;
    icon?: string;
  };
  chat?: {
    title?: string;
    placeholder?: string;
    showTimestamp?: boolean;
  };
}

export interface WidgetMessage {
  id: string;
  role: 'user' | 'bot' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type WidgetEvent = 'open' | 'close' | 'message' | 'error';
