import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { ReviewsService } from '../reviews/reviews.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

// Upload de avatar do consultor (somente admin) — vai para uploads/avatars
// e é servido publicamente em /api/uploads/avatars/<filename>.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const AVATARS_DIR = join(UPLOAD_ROOT, 'avatars');
try {
  mkdirSync(AVATARS_DIR, { recursive: true });
} catch {
  // ignore
}
const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB

@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private reviews: ReviewsService,
    private systemSettings: SystemSettingsService,
  ) {}

  // ---- Pricing (preços globais) ----
  @Get('pricing')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getPricing() {
    return this.systemSettings.getPricing();
  }

  @Patch('pricing')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updatePricing(
    @Body() body: { chat?: number; voice?: number; video?: number },
  ) {
    return this.systemSettings.setPricing({
      chat: typeof body?.chat === 'number' ? body.chat : undefined,
      voice: typeof body?.voice === 'number' ? body.voice : undefined,
      video: typeof body?.video === 'number' ? body.video : undefined,
    });
  }

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

  // Upload de avatar do consultor — apenas admin.
  @Post('consultants/:id/avatar')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATARS_DIR,
        filename: (_req, file, cb) => {
          const ext = (extname(file.originalname) || '.bin').toLowerCase();
          cb(null, `${Date.now()}-${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: AVATAR_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!AVATAR_ALLOWED_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Tipo de arquivo não suportado (use jpg, png ou webp)',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadConsultantAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    const url = `/api/uploads/avatars/${file.filename}`;
    return this.admin.setConsultantAvatar(id, url);
  }

  // Remover avatar do consultor — apenas admin.
  @Delete('consultants/:id/avatar')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async clearConsultantAvatar(@Param('id') id: string) {
    return this.admin.setConsultantAvatar(id, null);
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
