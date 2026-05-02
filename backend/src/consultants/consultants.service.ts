import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Consultant } from '../database/entities/consultant.entity';
import { Consultation } from '../database/entities/consultation.entity';

@Injectable()
export class ConsultantsService {
  constructor(
    @InjectRepository(Consultant)
    private consultantsRepository: Repository<Consultant>,
    @InjectRepository(Consultation)
    private consultationsRepository: Repository<Consultation>,
  ) {}

  async findAll() {
    return this.consultantsRepository.find({
      where: { isActive: true },
      select: [
        'id',
        'name',
        'specialty',
        'bio',
        'rating',
        'pricePerMinute',
        'isAvailable',
        'consultationsCount',
      ],
      order: { rating: 'DESC' },
    });
  }

  async findById(id: string) {
    const consultant = await this.consultantsRepository.findOne({ where: { id } });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');
    const { password, ...rest } = consultant;
    return rest;
  }

  async updateAvailability(id: string, isAvailable: boolean) {
    await this.consultantsRepository.update(id, { isAvailable });
    return this.findById(id);
  }

  async updateProfile(
    id: string,
    body: {
      name?: string;
      email?: string;
      specialty?: string;
      bio?: string;
      pricePerMinute?: number;
    },
  ) {
    const consultant = await this.consultantsRepository.findOne({ where: { id } });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    if (body.email && body.email !== consultant.email) {
      const exists = await this.consultantsRepository.findOne({
        where: { email: body.email },
      });
      if (exists) throw new ConflictException('E-mail já está em uso');
      consultant.email = body.email;
    }
    if (body.name !== undefined) consultant.name = body.name;
    if (body.specialty !== undefined) consultant.specialty = body.specialty;
    if (body.bio !== undefined) consultant.bio = body.bio;
    if (body.pricePerMinute !== undefined && Number(body.pricePerMinute) > 0) {
      consultant.pricePerMinute = Number(body.pricePerMinute);
    }

    await this.consultantsRepository.save(consultant);
    const { password, ...rest } = consultant;
    return rest;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const consultant = await this.consultantsRepository.findOne({ where: { id } });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    const ok = await bcrypt.compare(currentPassword, consultant.password);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');

    consultant.password = await bcrypt.hash(newPassword, 10);
    await this.consultantsRepository.save(consultant);
    return { ok: true };
  }

  async getStats(consultantId: string) {
    const consultant = await this.consultantsRepository.findOne({
      where: { id: consultantId },
    });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month, all] = await Promise.all([
      this.consultationsRepository.find({
        where: { consultantId, status: 'completed', startedAt: MoreThanOrEqual(startOfDay) },
      }),
      this.consultationsRepository.find({
        where: { consultantId, status: 'completed', startedAt: MoreThanOrEqual(startOfWeek) },
      }),
      this.consultationsRepository.find({
        where: { consultantId, status: 'completed', startedAt: MoreThanOrEqual(startOfMonth) },
      }),
      this.consultationsRepository.find({
        where: { consultantId, status: 'completed' },
        order: { startedAt: 'DESC' },
        take: 10,
      }),
    ]);

    const sumCredits = (arr: Consultation[]) =>
      arr.reduce((s, c) => s + Number(c.creditsUsed || 0), 0);

    return {
      consultationsToday: today.length,
      consultationsWeek: week.length,
      consultationsMonth: month.length,
      totalConsultations: consultant.consultationsCount,
      earningsToday: sumCredits(today),
      earningsWeek: sumCredits(week),
      earningsMonth: sumCredits(month),
      rating: Number(consultant.rating),
      recentConsultations: all.map((c) => ({
        id: c.id,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        minutesUsed: Number(c.minutesUsed),
        creditsUsed: Number(c.creditsUsed),
      })),
    };
  }
}
