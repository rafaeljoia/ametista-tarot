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

  // Público — frontend usa pra exibir o prazo restante das oferendas.
  // Oferenda fica "enabled" sempre que houver um preço > 0 cadastrado, independente
  // da flag "post_call_offer_enabled" (que controla apenas o popup automático pós-call).
  @Get('offering-settings')
  async getOfferingSettings() {
    const [offer, deadlineHours] = await Promise.all([
      this.settings.getPostCallOffer(),
      this.settings.getOfferingDeadlineHours(),
    ]);
    const price = Number(offer.price) || 0;
    return {
      enabled: price > 0,
      price,
      deadlineHours,
      // separado, caso o frontend queira respeitar o toggle do admin no popup automático
      postCallEnabled: offer.enabled,
    };
  }

  // Admin — atualiza prazo das oferendas (em horas)
  @Patch('admin/offering-deadline')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateOfferingDeadline(@Body() body: { hours: number }) {
    const hours = await this.settings.setOfferingDeadlineHours(Number(body?.hours));
    return { deadlineHours: hours };
  }
}
