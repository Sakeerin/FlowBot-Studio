# FlowBot Widget

Embeddable chat widget for FlowBot Studio.

## Installation

The widget can be embedded in any website via a script tag or imported as a module.

## Usage

### Script Tag Embedding

Add this script tag to your HTML:

```html
<script
  src="https://your-cdn.com/widget.js"
  data-api-url="https://api.yourdomain.com"
  data-bot-id="your-bot-id"
  data-position="bottom-right"
  data-theme-primary="#007bff"
  data-chat-title="Chat with us"
></script>
```

### Configuration Options

- **data-api-url** (required): URL of the FlowBot API server
- **data-bot-id**: ID of the bot to connect to (optional if channel is configured)
- **data-channel-id**: ID of the channel connection (optional)
- **data-user-id**: Custom user ID (optional, auto-generated if not provided)
- **data-position**: Widget position - 'bottom-right', 'bottom-left', 'top-right', or 'top-left' (default: 'bottom-right')
- **data-theme-primary**: Primary color for the widget theme (default: '#007bff')
- **data-chat-title**: Title displayed in the chat window header (default: 'Chat')
- **data-chat-placeholder**: Placeholder text for the input field (default: 'Type a message...')

### Programmatic API

After the widget is loaded, you can control it programmatically:

```javascript
// Open the widget
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
});

window.FlowBotWidget?.on('error', (error) => {
  console.error('Widget error:', error);
});
```

### Module Usage

```typescript
import { FlowBotWidget } from '@flowbot/widget';

const widget = new FlowBotWidget({
  apiUrl: 'https://api.yourdomain.com',
  botId: 'your-bot-id',
  position: 'bottom-right',
  theme: {
    primaryColor: '#007bff',
    backgroundColor: '#ffffff',
    textColor: '#333333',
  },
  chat: {
    title: 'Chat with us',
    placeholder: 'Type a message...',
    showTimestamp: true,
  },
});

widget.open();
widget.on('message', (data) => {
  console.log('New message:', data);
});
```

## Development

```bash
# Build
pnpm build

# Type check
pnpm type-check
```
