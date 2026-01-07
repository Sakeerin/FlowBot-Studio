import { Test, TestingModule } from '@nestjs/testing';
import { ChannelAdapterFactory } from './channel-adapter.factory';
import { WebChannelAdapter } from './web-channel.adapter';
import { LineChannelAdapter } from './line-channel.adapter';
import { ChannelAdapter } from './channel-adapter.interface';

describe('ChannelAdapterFactory', () => {
  let factory: ChannelAdapterFactory;
  let webAdapter: WebChannelAdapter;
  let lineAdapter: LineChannelAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelAdapterFactory,
        WebChannelAdapter,
        LineChannelAdapter,
      ],
    }).compile();

    factory = module.get<ChannelAdapterFactory>(ChannelAdapterFactory);
    webAdapter = module.get<WebChannelAdapter>(WebChannelAdapter);
    lineAdapter = module.get<LineChannelAdapter>(LineChannelAdapter);
  });

  it('should return web adapter for web channel', () => {
    const adapter = factory.getAdapter('web');
    expect(adapter).toBe(webAdapter);
    expect(adapter).toBeInstanceOf(WebChannelAdapter);
  });

  it('should return line adapter for line channel', () => {
    const adapter = factory.getAdapter('line');
    expect(adapter).toBe(lineAdapter);
    expect(adapter).toBeInstanceOf(LineChannelAdapter);
  });

  it('should throw error for unknown channel', () => {
    expect(() => factory.getAdapter('unknown' as any)).toThrow(
      'Unknown channel type: unknown'
    );
  });

  it('should throw error for unimplemented channels', () => {
    expect(() => factory.getAdapter('facebook')).toThrow(
      'Facebook adapter not yet implemented'
    );
    expect(() => factory.getAdapter('whatsapp')).toThrow(
      'WhatsApp adapter not yet implemented'
    );
    expect(() => factory.getAdapter('telegram')).toThrow(
      'Telegram adapter not yet implemented'
    );
  });
});

