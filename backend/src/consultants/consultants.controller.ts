import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsultantsService } from './consultants.service';
import { PresenceService } from '../presence/presence.service';
import { AvailabilityAlertService } from '../notifications/availability-alert.service';

// Public-safe shape for consultant data — never includes email, password, or internal flags.
function toPublic(c: any, isOnline?: boolean) {
  if (!c) return c;
  return {
    id: c.id,
    name: c.name,
    specialty: c.specialty,
    bio: c.bio,
    rating: c.rating,
    pricePerMinute: c.pricePerMinute,
    isAvailable: c.isAvailable,
    consultationsCount: c.consultationsCount,
    ...(isOnline !== undefined ? { isOnline } : {}),
  };
}

@Controller('consultants')
export class ConsultantsController {
  constructor(
    private consultantsService: ConsultantsService,
    private presenceService: PresenceService,
    private availabilityAlerts: AvailabilityAlertService,
  ) {}

  @Get('online')
  getOnlineConsultants() {
    return { ids: this.presenceService.getOnlineConsultantIds() };
  }

  @Get()
  async findAll() {
    const onlineIds = this.presenceService.getOnlineConsultantIds();
    const list = await this.consultantsService.findAll();
    return list.map((c) => toPublic(c, onlineIds.includes(c.id)));
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Request() req) {
    if (req.user.role !== 'consultant') throw new ForbiddenException();
    return this.consultantsService.findById(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateMe(
    @Request() req,
    @Body()
    body: {
      name?: string;
      email?: string;
      specialty?: string;
      bio?: string;
      pricePerMinute?: number;
    },
  ) {
    if (req.user.role !== 'consultant') throw new ForbiddenException();
    return this.consultantsService.updateProfile(req.user.id, body);
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (req.user.role !== 'consultant') throw new ForbiddenException();
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('Nova senha deve ter ao menos 6 caracteres');
    }
    return this.consultantsService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('me/stats')
  @UseGuards(AuthGuard('jwt'))
  async getMyStats(@Request() req) {
    if (req.user.role !== 'consultant') throw new ForbiddenException();
    return this.consultantsService.getStats(req.user.id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.consultantsService.getStats(id);
  }

  @Get('me/alerts')
  @UseGuards(AuthGuard('jwt'))
  async getMyAlerts(@Request() req) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    const ids = await this.availabilityAlerts.getMyActiveAlerts(req.user.id);
    return { consultantIds: ids };
  }

  @Post(':id/notify-me')
  @UseGuards(AuthGuard('jwt'))
  async requestNotifyMe(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    // Não faz sentido se o consultor já está online — informa cliente.
    const isOnline = this.presenceService.isConsultantOnline(id);
    if (isOnline) {
      return { ok: true, alreadyOnline: true };
    }
    return this.availabilityAlerts.requestAlert(req.user.id, id);
  }

  @Get(':id/notify-me')
  @UseGuards(AuthGuard('jwt'))
  async getNotifyMeStatus(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.availabilityAlerts.getStatusForUser(req.user.id, id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const onlineIds = this.presenceService.getOnlineConsultantIds();
    const consultant = await this.consultantsService.findById(id);
    return toPublic(consultant, onlineIds.includes(consultant.id));
  }
}
