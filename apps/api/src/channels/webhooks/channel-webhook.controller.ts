import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ChannelWebhookService } from './channel-webhook.service';
import { ChannelWebhookPayload } from '@shared/schemas/channel';

@Controller('webhooks/channel')
export class ChannelWebhookController {
  constructor(private readonly webhookService: ChannelWebhookService) {}

  @Post(':channel')
  async handleWebhook(
    @Param('channel') channel: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    try {
      const payload = await this.webhookService.processWebhook(
        channel,
        body,
        headers,
        req.rawBody
      );

      // For LINE, we need to return 200 OK immediately
      // For other channels, we can return the response
      if (channel === 'line') {
        res.status(200).json({ success: true });
        return;
      }

      res.json({
        success: true,
        sessionId: payload.sessionId,
        messages: payload.messages,
      });
    } catch (error) {
      console.error(`Webhook error for ${channel}:`, error);
      res.status(400).json({
        success: false,
        error: error.message || 'Webhook processing failed',
      });
    }
  }
}

