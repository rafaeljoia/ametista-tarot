import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { SystemSettingsService } from './system-settings.service';

@Controller()
export class PricingController {
  constructor(private settings: SystemSettingsService) {}

  // Público — usado pelo frontend pra exibir preços nos botões de chamada.
  @Get('pricing')
  async getPricing() {
    return this.settings.getPricing();
  }

  // Público — frontend usa pra montar o modal pós-atendimento (texto/preço/enabled)
  @Get('post-call-offer')
  async getOffer() {
    return this.settings.getPostCallOffer();
  }

  // Admin — atualiza oferta pós-atendimento
  @Patch('admin/post-call-offer')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateOffer(
    @Body() body: { enabled?: boolean; price?: number; text?: string },
  ) {
    return this.settings.setPostCallOffer({
      enabled: body?.enabled,
      price: body?.price,
      text: body?.text,
    });
  }
}
