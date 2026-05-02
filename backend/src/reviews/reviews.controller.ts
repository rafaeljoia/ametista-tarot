import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('consultations/:id/review')
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Request() req,
    @Param('id') consultationId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.reviews.createReview(
      req.user.id,
      consultationId,
      Number(body?.rating),
      body?.comment,
    );
  }

  @Get('consultations/:id/review')
  @UseGuards(AuthGuard('jwt'))
  async get(@Request() req, @Param('id') consultationId: string) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.reviews.getByConsultation(consultationId, req.user.id);
  }

  @Get('consultants/:id/reviews')
  async listForConsultant(
    @Param('id') consultantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.listForConsultant(consultantId, Number(limit) || 10);
  }
}
