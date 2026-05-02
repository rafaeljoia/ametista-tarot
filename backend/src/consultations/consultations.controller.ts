import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
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
  async end(@Request() req, @Param('id') id: string) {
    // Business rule: only the client may end a consultation. Consultants are
    // not allowed to terminate the call from their side — they must wait for
    // the client to end (or for credits to run out, which auto-ends).
    if (req.user.role === 'consultant') {
      throw new ForbiddenException(
        'Apenas o cliente pode encerrar a consulta.',
      );
    }
    // Authorization: only the client or the consultant of the call can end it.
    await this.consultations.ensureCanEnd(req.user.role, req.user.id, id);

    // The billing service computes elapsed time from server-side `startedAt`.
    // Client input is intentionally NOT trusted to prevent overbilling abuse.
    const ended = await this.billing.endConsultation(id);

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
