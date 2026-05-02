import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { ReviewsService } from '../reviews/reviews.service';

@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private reviews: ReviewsService,
  ) {}

  // ---- AUTH (público) ----
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.admin.login(body?.email, body?.password);
  }

  // ---- A partir daqui exige admin ----
  @Get('me')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async me(@Request() req) {
    return { id: req.user.id, email: req.user.email, name: req.user.name };
  }

  // Stats / Financeiro
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async stats(@Query('period') period?: 'day' | 'week' | 'month' | 'all') {
    return this.admin.getStats(period || 'month');
  }

  @Get('finance/commissions')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async commissions() {
    return this.admin.getCommissionsToPay();
  }

  @Post('finance/payouts')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async createPayout(
    @Request() req,
    @Body()
    body: {
      consultantId: string;
      amount: number;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.admin.registerPayout(
      body.consultantId,
      Number(body.amount),
      req.user.id,
      body.reference,
      body.notes,
    );
  }

  @Get('finance/payouts')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listPayouts(@Query('consultantId') consultantId?: string) {
    return this.admin.listPayouts(consultantId);
  }

  // Consultores
  @Get('consultants')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listConsultants(@Query('q') q?: string) {
    return this.admin.listConsultants(q);
  }

  @Post('consultants')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async createConsultant(@Body() body: any) {
    return this.admin.createConsultant(body);
  }

  @Patch('consultants/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateConsultant(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateConsultant(id, body);
  }

  // Usuários
  @Get('users')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listUsers(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.admin.listUsers(q, Number(limit) || 100, Number(offset) || 0);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async userDetail(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async setUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.admin.setUserActive(id, !!body?.isActive);
  }

  // Transações
  @Get('transactions')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listTransactions(@Query() query: any) {
    return this.admin.listTransactions(query);
  }

  // Consultas
  @Get('consultations')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listConsultations(@Query() query: any) {
    return this.admin.listConsultations(query);
  }

  @Get('consultations/:id/messages')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async consultationMessages(@Param('id') id: string) {
    return this.admin.getConsultationMessages(id);
  }

  // Reviews
  @Get('reviews')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async listReviews(
    @Query('hidden') hidden?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviews.listAllForAdmin({
      hidden: hidden === undefined ? undefined : hidden === 'true',
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
  }

  @Patch('reviews/:id/hide')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async hideReview(
    @Param('id') id: string,
    @Body() body: { hidden: boolean; reason?: string },
  ) {
    return this.reviews.setHidden(id, !!body?.hidden, body?.reason);
  }

  @Get('reviews/stats/overall')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async reviewsStats() {
    return this.reviews.getOverallStats();
  }
}
