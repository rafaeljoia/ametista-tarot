import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
  @UseGuards(AuthGuard('jwt'))
  async findAll() {
    return this.consultantsService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: string) {
    return this.consultantsService.findById(id);
  }
}
