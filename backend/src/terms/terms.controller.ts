import { Controller, Get } from '@nestjs/common';
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Get('current')
  async current() {
    return this.terms.getActive();
  }
}
