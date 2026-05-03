import { Controller, Get } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';

@Controller('pricing')
export class PricingController {
  constructor(private settings: SystemSettingsService) {}

  // Público — usado pelo frontend pra exibir preços nos botões de chamada.
  @Get()
  async get() {
    return this.settings.getPricing();
  }
}
