import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '../database/entities/consultation.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { User } from '../database/entities/user.entity';

export type Role = 'user' | 'consultant';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private consultationsRepo: Repository<Consultation>,
    @InjectRepository(Consultant)
    private consultantsRepo: Repository<Consultant>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async listForUser(role: Role, id: string) {
    const where =
      role === 'consultant' ? { consultantId: id } : { clientId: id };

    const items = await this.consultationsRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) return [];

    // Hydrate counterpart names in a single query each
    const counterpartIds = Array.from(
      new Set(
        items.map((c) => (role === 'consultant' ? c.clientId : c.consultantId)),
      ),
    );

    const counterparts =
      role === 'consultant'
        ? await this.usersRepo.findByIds(counterpartIds)
        : await this.consultantsRepo.findByIds(counterpartIds);

    const map = new Map<string, any>(
      counterparts.map((c) => [c.id, c] as [string, any]),
    );

    return items.map((c) => {
      const other =
        role === 'consultant' ? map.get(c.clientId) : map.get(c.consultantId);
      return {
        id: c.id,
        clientId: c.clientId,
        consultantId: c.consultantId,
        status: c.status,
        minutesUsed: Number(c.minutesUsed || 0),
        creditsUsed: Number(c.creditsUsed || 0),
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        createdAt: c.createdAt,
        counterpartName: other?.name || null,
        counterpartSpecialty:
          role === 'user' ? (other as Consultant)?.specialty || null : null,
      };
    });
  }

  async findByIdForUser(role: Role, id: string, consultationId: string) {
    const c = await this.consultationsRepo.findOne({ where: { id: consultationId } });
    if (!c) throw new NotFoundException('Consulta não encontrada');

    if (role === 'user' && c.clientId !== id) throw new ForbiddenException();
    if (role === 'consultant' && c.consultantId !== id) throw new ForbiddenException();

    const consultant = await this.consultantsRepo.findOne({
      where: { id: c.consultantId },
    });
    const client = await this.usersRepo.findOne({ where: { id: c.clientId } });

    return {
      id: c.id,
      clientId: c.clientId,
      consultantId: c.consultantId,
      status: c.status,
      minutesUsed: Number(c.minutesUsed || 0),
      creditsUsed: Number(c.creditsUsed || 0),
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      consultant: consultant
        ? {
            id: consultant.id,
            name: consultant.name,
            specialty: consultant.specialty,
            pricePerMinute: Number(consultant.pricePerMinute || 0),
          }
        : null,
      client: client ? { id: client.id, name: client.name } : null,
    };
  }

  async ensureCanEnd(role: Role, id: string, consultationId: string) {
    const c = await this.consultationsRepo.findOne({ where: { id: consultationId } });
    if (!c) throw new NotFoundException('Consulta não encontrada');
    if (role === 'user' && c.clientId !== id) throw new ForbiddenException();
    if (role === 'consultant' && c.consultantId !== id) throw new ForbiddenException();
    return c;
  }
}
