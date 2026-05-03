import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsVersion } from '../database/entities/terms-version.entity';
import { TermsAcceptance } from '../database/entities/terms-acceptance.entity';

export interface PublicTermsView {
  id: string;
  version: number;
  content: string;
  publishedAt: Date;
}

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(TermsVersion)
    private readonly termsRepo: Repository<TermsVersion>,
    @InjectRepository(TermsAcceptance)
    private readonly acceptRepo: Repository<TermsAcceptance>,
  ) {}

  async getActive(): Promise<PublicTermsView> {
    const t = await this.termsRepo.findOne({
      where: { isActive: true },
      order: { version: 'DESC' },
    });
    if (!t) {
      throw new NotFoundException('Nenhuma versão de termos ativa');
    }
    return {
      id: t.id,
      version: t.version,
      content: t.content,
      publishedAt: t.publishedAt,
    };
  }

  async getActiveOrNull(): Promise<TermsVersion | null> {
    return this.termsRepo.findOne({
      where: { isActive: true },
      order: { version: 'DESC' },
    });
  }

  async listAll(): Promise<TermsVersion[]> {
    return this.termsRepo.find({ order: { version: 'DESC' } });
  }

  async getById(id: string): Promise<TermsVersion> {
    const t = await this.termsRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Versão não encontrada');
    return t;
  }

  /**
   * Cria uma nova versão (+1 acima da maior existente) e a torna ativa.
   * Desativa todas as anteriores.
   */
  async publishNewVersion(input: {
    content: string;
    publishedBy: string;
    publishedByName: string;
  }): Promise<TermsVersion> {
    const last = await this.termsRepo.findOne({
      where: {},
      order: { version: 'DESC' },
    });
    const nextVersion = (last?.version ?? 0) + 1;

    await this.termsRepo.update({ isActive: true }, { isActive: false });

    const created = this.termsRepo.create({
      version: nextVersion,
      content: input.content,
      isActive: true,
      publishedBy: input.publishedBy,
      publishedByName: input.publishedByName,
    });
    return this.termsRepo.save(created);
  }

  async recordAcceptance(input: {
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    termsVersionId: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<TermsAcceptance> {
    const v = await this.termsRepo.findOne({
      where: { id: input.termsVersionId },
    });
    if (!v) throw new NotFoundException('Versão de termos inválida');
    const created = this.acceptRepo.create({
      userId: input.userId,
      userName: input.userName ?? null,
      userEmail: input.userEmail ?? null,
      termsVersionId: v.id,
      termsVersion: v.version,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
    return this.acceptRepo.save(created);
  }

  async listAcceptances(input: {
    page?: number;
    pageSize?: number;
    versionId?: string;
    search?: string;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const qb = this.acceptRepo.createQueryBuilder('a').orderBy('a.acceptedAt', 'DESC');
    if (input.versionId) {
      qb.andWhere('a."termsVersionId" = :vid', { vid: input.versionId });
    }
    if (input.search) {
      qb.andWhere('(a."userName" ILIKE :q OR a."userEmail" ILIKE :q)', {
        q: `%${input.search}%`,
      });
    }
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }
}
