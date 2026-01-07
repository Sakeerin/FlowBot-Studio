import { Injectable } from '@nestjs/common';
import { ChannelAdapter } from './channel-adapter.interface';
import { WebChannelAdapter } from './web-channel.adapter';
import { LineChannelAdapter } from './line-channel.adapter';

@Injectable()
export class ChannelAdapterFactory {
  constructor(
    private webAdapter: WebChannelAdapter,
    private lineAdapter: LineChannelAdapter
  ) {}

  getAdapter(channel: string): ChannelAdapter {
    switch (channel) {
      case 'web':
        return this.webAdapter;
      case 'line':
        return this.lineAdapter;
      case 'facebook':
        // TODO: Implement Facebook adapter
        throw new Error('Facebook adapter not yet implemented');
      case 'whatsapp':
        // TODO: Implement WhatsApp adapter
        throw new Error('WhatsApp adapter not yet implemented');
      case 'telegram':
        // TODO: Implement Telegram adapter
        throw new Error('Telegram adapter not yet implemented');
      default:
        throw new Error(`Unknown channel type: ${channel}`);
    }
  }
}

