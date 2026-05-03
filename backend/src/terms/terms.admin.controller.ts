import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { TermsService } from './terms.service';

@Controller('admin/terms')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class TermsAdminController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  async list() {
    return this.terms.listAll();
  }

  @Get('acceptances')
  async acceptances(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('versionId') versionId?: string,
    @Query('search') search?: string,
  ) {
    return this.terms.listAcceptances({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      versionId,
      search,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.terms.getById(id);
  }

  /**
   * Publica nova versão dos termos. O conteúdo enviado vira a v(N+1) e
   * todas as anteriores são marcadas como inativas.
   */
  @Post()
  async publish(@Body() body: { content?: string }, @Request() req: any) {
    const content = (body?.content || '').trim();
    if (!content || content.length < 50) {
      throw new BadRequestException(
        'Conteúdo dos termos não pode estar vazio (mínimo 50 caracteres)',
      );
    }
    return this.terms.publishNewVersion({
      content,
      publishedBy: req.user?.sub,
      publishedByName: req.user?.email || 'admin',
    });
  }
}
