import { FlowBotWidget } from './widget';
import { WidgetConfig } from './types';

// Global widget instance
let widgetInstance: FlowBotWidget | null = null;

// Initialize widget from script tag
function initFromScript(): void {
  const script = document.currentScript as HTMLScriptElement;
  if (!script) {
    console.error('FlowBot widget: Could not find script tag');
    return;
  }

  const apiUrl = script.getAttribute('data-api-url') || script.dataset.apiUrl;
  const botId = script.getAttribute('data-bot-id') || script.dataset.botId;
  const channelId = script.getAttribute('data-channel-id') || script.dataset.channelId;
  const userId = script.getAttribute('data-user-id') || script.dataset.userId;
  const position = (script.getAttribute('data-position') || script.dataset.position) as
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'top-left'
    | undefined;

  if (!apiUrl) {
    console.error('FlowBot widget: data-api-url is required');
    return;
  }

  const config: WidgetConfig = {
    apiUrl,
    botId,
    channelId,
    userId,
    position,
  };

  // Parse theme from data attributes if provided
  const primaryColor = script.getAttribute('data-theme-primary') || script.dataset.themePrimary;
  if (primaryColor) {
    config.theme = {
      ...config.theme,
      primaryColor,
    };
  }

  widgetInstance = new FlowBotWidget(config);

  // Expose to window for programmatic access
  (window as any).FlowBotWidget = widgetInstance;
}

// Auto-initialize if script is loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFromScript);
  } else {
    initFromScript();
  }
}

// Export for module usage
export { FlowBotWidget } from './widget';
export type { WidgetConfig, WidgetMessage, WidgetEvent } from './types';
