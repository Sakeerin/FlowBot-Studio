import { Module, Global } from '@nestjs/common';
import { GuardrailsService } from './guardrails.service';

@Global()
@Module({
  providers: [GuardrailsService],
  exports: [GuardrailsService],
})
export class GuardrailsModule {}

