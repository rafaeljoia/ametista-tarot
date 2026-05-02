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
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsultantsService } from './consultants.service';
import { PresenceService } from '../presence/presence.service';

@Controller('consultants')
export class ConsultantsController {
  constructor(
    private consultantsService: ConsultantsService,
    private presenceService: PresenceService,
  ) {}

  @Get('online')
  getOnlineConsultants() {
    return { ids: this.presenceService.getOnlineConsultantIds() };
  }

  @Get()
  async findAll() {
    const onlineIds = this.presenceService.getOnlineConsultantIds();
    const list = await this.consultantsService.findAll();
    return list.map((c) => ({ ...c, isOnline: onlineIds.includes(c.id) }));
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

  @Get(':id')
  async findById(@Param('id') id: string) {
    const onlineIds = this.presenceService.getOnlineConsultantIds();
    const consultant = await this.consultantsService.findById(id);
    return { ...consultant, isOnline: onlineIds.includes(consultant.id) };
  }
}
