import { Controller, Post, Param, Body } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { RuntimeInboundMessagePayload } from '@shared/schemas/runtime';

@Controller('runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Post('inbound/:channel')
  async processInbound(
    @Param('channel') channel: string,
    @Body() payload: RuntimeInboundMessagePayload
  ) {
    return this.runtimeService.processInbound(channel, payload);
  }
}

