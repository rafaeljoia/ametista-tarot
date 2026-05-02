import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsultationsService } from './consultations.service';
import { BillingService } from '../billing/billing.service';
import { ChatGateway } from '../chat/chat.gateway';

@Controller('consultations')
@UseGuards(AuthGuard('jwt'))
export class ConsultationsController {
  constructor(
    private consultations: ConsultationsService,
    private billing: BillingService,
    private chatGateway: ChatGateway,
  ) {}

  @Get()
  async list(@Request() req) {
    return this.consultations.listForUser(req.user.role, req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.consultations.findByIdForUser(req.user.role, req.user.id, id);
  }

  @Post(':id/end')
  async end(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { elapsedMinutes?: number },
  ) {
    const consultation = await this.consultations.ensureCanEnd(
      req.user.role,
      req.user.id,
      id,
    );

    // Compute elapsed minutes from startedAt as a server-side fallback
    const elapsedFallback = consultation.startedAt
      ? Math.max(
          0,
          (Date.now() - new Date(consultation.startedAt).getTime()) / 60000,
        )
      : undefined;

    const elapsed =
      typeof body?.elapsedMinutes === 'number' && body.elapsedMinutes >= 0
        ? body.elapsedMinutes
        : elapsedFallback;

    const ended = await this.billing.endConsultation(id, elapsed);

    // Notify both parties and stop ticks
    this.chatGateway.notifyEnded(id, {
      reason: req.user.role === 'consultant' ? 'consultant-ended' : 'user-ended',
      minutesUsed: Number(ended?.minutesUsed || 0),
      creditsUsed: Number(ended?.creditsUsed || 0),
    });

    return {
      id: ended?.id,
      status: ended?.status,
      minutesUsed: Number(ended?.minutesUsed || 0),
      creditsUsed: Number(ended?.creditsUsed || 0),
      endedAt: ended?.endedAt,
    };
  }
}
