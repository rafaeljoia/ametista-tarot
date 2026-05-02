import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../database/entities/review.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Consultant } from '../database/entities/consultant.entity';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private reviewsRepo: Repository<Review>,
    @InjectRepository(Consultation)
    private consultationsRepo: Repository<Consultation>,
    @InjectRepository(Consultant)
    private consultantsRepo: Repository<Consultant>,
  ) {}

  async createReview(
    clientId: string,
    consultationId: string,
    rating: number,
    comment?: string | null,
  ) {
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Avaliação deve ser de 1 a 5 estrelas');
    }
    const cleanComment = (comment || '').trim().slice(0, 1000) || null;

    return this.reviewsRepo.manager.transaction(async (tx) => {
      const consultation = await tx.findOne(Consultation, {
        where: { id: consultationId },
      });
      if (!consultation) throw new NotFoundException('Consulta não encontrada');
      if (consultation.clientId !== clientId) throw new ForbiddenException();
      if (consultation.status !== 'completed') {
        throw new BadRequestException(
          'Só é possível avaliar consultas finalizadas',
        );
      }

      const existing = await tx.findOne(Review, { where: { consultationId } });
      if (existing) {
        throw new ConflictException('Esta consulta já foi avaliada');
      }

      const review = tx.create(Review, {
        consultationId,
        clientId,
        consultantId: consultation.consultantId,
        rating: Math.round(rating),
        comment: cleanComment,
      });

      try {
        await tx.save(Review, review);
      } catch (err: any) {
        // Race com outro envio simultâneo cai aqui pelo unique index.
        if (String(err?.message || '').toLowerCase().includes('duplicate')) {
          throw new ConflictException('Esta consulta já foi avaliada');
        }
        throw err;
      }

      // Recalcular média e total no consultor (apenas reviews visíveis).
      const stats = await tx
        .createQueryBuilder(Review, 'r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.consultantId = :id', { id: consultation.consultantId })
        .andWhere('r.isHidden = false')
        .getRawOne<{ avg: string | null; count: string }>();

      const avg = stats?.avg ? Number(stats.avg) : 5.0;
      await tx.update(
        Consultant,
        { id: consultation.consultantId },
        { rating: Number(avg.toFixed(2)) },
      );

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      };
    });
  }

  /** Lê o review de uma consulta (se existir) — usado pela tela de finalização. */
  async getByConsultation(consultationId: string, clientId: string) {
    const consultation = await this.consultationsRepo.findOne({
      where: { id: consultationId },
    });
    if (!consultation) throw new NotFoundException();
    if (consultation.clientId !== clientId) throw new ForbiddenException();
    const review = await this.reviewsRepo.findOne({ where: { consultationId } });
    if (!review) return null;
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    };
  }

  async listForConsultant(consultantId: string, limit = 10) {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
    const rows = await this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoin('users', 'u', 'u.id = r.clientId')
      .where('r.consultantId = :id', { id: consultantId })
      .andWhere('r.isHidden = false')
      .orderBy('r.createdAt', 'DESC')
      .limit(safeLimit)
      .select([
        'r.id AS id',
        'r.rating AS rating',
        'r.comment AS comment',
        'r."createdAt" AS "createdAt"',
        'u.name AS "clientName"',
      ])
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.createdAt,
      clientFirstName: (r.clientName || 'Anônimo').split(' ')[0],
    }));
  }

  // -------------------- ADMIN --------------------

  async listAllForAdmin(filters: { hidden?: boolean; limit?: number; offset?: number }) {
    const { hidden, limit = 50, offset = 0 } = filters;
    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 200);
    const safeOffset = Math.max(0, Number(offset) || 0);

    const qb = this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoin('users', 'u', 'u.id = r.clientId')
      .leftJoin('consultants', 'c', 'c.id = r.consultantId')
      .orderBy('r.createdAt', 'DESC')
      .limit(safeLimit)
      .offset(safeOffset)
      .select([
        'r.id AS id',
        'r.rating AS rating',
        'r.comment AS comment',
        'r."isHidden" AS "isHidden"',
        'r."createdAt" AS "createdAt"',
        'r."consultationId" AS "consultationId"',
        'u.name AS "clientName"',
        'c.id AS "consultantId"',
        'c.name AS "consultantName"',
      ]);

    if (hidden !== undefined) {
      qb.where('r."isHidden" = :h', { h: hidden });
    }

    const items = await qb.getRawMany();
    const total = await this.reviewsRepo.count(
      hidden !== undefined ? { where: { isHidden: hidden } } : {},
    );

    return {
      total,
      items: items.map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment,
        isHidden: !!r.isHidden,
        createdAt: r.createdAt,
        consultationId: r.consultationId,
        clientName: r.clientName,
        consultant: { id: r.consultantId, name: r.consultantName },
      })),
    };
  }

  async setHidden(reviewId: string, hidden: boolean, reason?: string) {
    return this.reviewsRepo.manager.transaction(async (tx) => {
      const review = await tx.findOne(Review, { where: { id: reviewId } });
      if (!review) throw new NotFoundException();
      review.isHidden = hidden;
      review.hiddenReason = hidden ? (reason || 'Conteúdo moderado').slice(0, 200) : null;
      await tx.save(Review, review);

      // Recalcular média do consultor após esconder/reexibir.
      const stats = await tx
        .createQueryBuilder(Review, 'r')
        .select('AVG(r.rating)', 'avg')
        .where('r.consultantId = :id', { id: review.consultantId })
        .andWhere('r.isHidden = false')
        .getRawOne<{ avg: string | null }>();

      const avg = stats?.avg ? Number(stats.avg) : 5.0;
      await tx.update(
        Consultant,
        { id: review.consultantId },
        { rating: Number(avg.toFixed(2)) },
      );

      return { id: review.id, isHidden: review.isHidden };
    });
  }

  async getOverallStats() {
    const stats = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE r.\"isHidden\" = true)", 'hidden')
      .getRawOne<{ avg: string | null; total: string; hidden: string }>();

    return {
      averageRating: stats?.avg ? Number(Number(stats.avg).toFixed(2)) : 0,
      totalReviews: Number(stats?.total || 0),
      hiddenReviews: Number(stats?.hidden || 0),
    };
  }
}
