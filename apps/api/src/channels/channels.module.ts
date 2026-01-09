import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelWebhookController } from './webhooks/channel-webhook.controller';
import { ChannelWebhookService } from './webhooks/channel-webhook.service';
import { ChannelAdapterFactory } from './adapters/channel-adapter.factory';
import { WebChannelAdapter } from './adapters/web-channel.adapter';
import { LineChannelAdapter } from './adapters/line-channel.adapter';
import { RuntimeModule } from '../runtime/runtime.module';

@Module({
  imports: [RuntimeModule],
  controllers: [ChannelsController, ChannelWebhookController],
  providers: [
    ChannelsService,
    ChannelWebhookService,
    ChannelAdapterFactory,
    WebChannelAdapter,
    LineChannelAdapter,
  ],
  exports: [ChannelsService, ChannelAdapterFactory],
})
export class ChannelsModule {}
