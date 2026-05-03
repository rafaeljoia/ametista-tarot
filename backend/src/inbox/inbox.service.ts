import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InboxMessage } from '../database/entities/inbox-message.entity';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(InboxMessage)
    private readonly repo: Repository<InboxMessage>,
  ) {}

  async push(input: {
    userId: string;
    kind: string;
    title: string;
    body: string;
    link?: string | null;
  }): Promise<InboxMessage> {
    const msg = this.repo.create({
      userId: input.userId,
      kind: input.kind,
      title: input.title.slice(0, 200),
      body: input.body,
      link: input.link ?? null,
      readAt: null,
    });
    return this.repo.save(msg);
  }

  async listForUser(userId: string, limit = 50): Promise<InboxMessage[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(input: { id: string; userId: string }): Promise<InboxMessage> {
    const msg = await this.repo.findOne({ where: { id: input.id } });
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    if (msg.userId !== input.userId) throw new ForbiddenException();
    if (!msg.readAt) {
      msg.readAt = new Date();
      await this.repo.save(msg);
    }
    return msg;
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const r = await this.repo
      .createQueryBuilder()
      .update(InboxMessage)
      .set({ readAt: () => 'now()' })
      .where('"userId" = :u AND "readAt" IS NULL', { u: userId })
      .execute();
    return { count: r.affected || 0 };
  }
}
