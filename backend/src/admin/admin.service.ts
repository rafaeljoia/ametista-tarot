import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Repository, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../database/entities/admin.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';
import { CommissionPayout } from '../database/entities/commission-payout.entity';
import { Message } from '../database/entities/message.entity';

type Period = 'day' | 'week' | 'month' | 'all';

function startOfPeriod(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null;
  }
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private admins: Repository<Admin>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Consultant) private consultants: Repository<Consultant>,
    @InjectRepository(Consultation) private consultations: Repository<Consultation>,
    @InjectRepository(Transaction) private transactions: Repository<Transaction>,
    @InjectRepository(ConsultantEarning) private earnings: Repository<ConsultantEarning>,
    @InjectRepository(CommissionPayout) private payouts: Repository<CommissionPayout>,
    @InjectRepository(Message) private messages: Repository<Message>,
    private jwt: JwtService,
  ) {}

  // -------------------- AUTH --------------------

  async login(email: string, password: string) {
    const admin = await this.admins.findOne({ where: { email } });
    if (!admin || !admin.isActive)
      throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const access_token = this.jwt.sign({
      sub: admin.id,
      email: admin.email,
      role: 'admin',
    });
    const { password: _, ...rest } = admin;
    return { admin: rest, access_token };
  }

  async createAdmin(email: string, password: string, name: string) {
    if (!email || !password || password.length < 8 || !name) {
      throw new BadRequestException(
        'Email, nome e senha (mín. 8 caracteres) são obrigatórios',
      );
    }
    const exists = await this.admins.findOne({ where: { email } });
    if (exists) throw new ConflictException('Admin já existe');
    const admin = this.admins.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: await bcrypt.hash(password, 10),
    });
    await this.admins.save(admin);
    const { password: _, ...rest } = admin;
    return rest;
  }

  // -------------------- CONSULTORES (CRUD) --------------------

  async listConsultants(q?: string) {
    const where = q
      ? [{ name: ILike(`%${q}%`) }, { email: ILike(`%${q}%`) }]
      : undefined;
    const list = await this.consultants.find({
      where: where as any,
      order: { createdAt: 'DESC' },
    });
    return list.map((c) => {
      const { password, ...rest } = c;
      return rest;
    });
  }

  async createConsultant(body: {
    name: string;
    email: string;
    password: string;
    specialty: string;
    bio?: string;
    pricePerMinute?: number;
    commissionPercent?: number;
  }) {
    if (!body?.email || !body?.password || body.password.length < 6) {
      throw new BadRequestException('Email e senha (mín. 6) obrigatórios');
    }
    const exists = await this.consultants.findOne({ where: { email: body.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const consultant = this.consultants.create({
      name: body.name,
      email: body.email.toLowerCase().trim(),
      password: await bcrypt.hash(body.password, 10),
      specialty: body.specialty || 'Tarot',
      bio: body.bio || null,
      pricePerMinute: body.pricePerMinute ? Number(body.pricePerMinute) : 1.0,
      commissionPercent:
        body.commissionPercent !== undefined ? Number(body.commissionPercent) : 50,
      isAvailable: false,
      isActive: true,
    });
    await this.consultants.save(consultant);
    const { password, ...rest } = consultant;
    return rest;
  }

  async updateConsultant(
    id: string,
    body: Partial<{
      name: string;
      email: string;
      specialty: string;
      bio: string;
      pricePerMinute: number;
      commissionPercent: number;
      isActive: boolean;
      isAvailable: boolean;
      password: string;
    }>,
  ) {
    const consultant = await this.consultants.findOne({ where: { id } });
    if (!consultant) throw new NotFoundException();

    if (body.email && body.email !== consultant.email) {
      const conflict = await this.consultants.findOne({ where: { email: body.email } });
      if (conflict) throw new ConflictException('E-mail já em uso');
      consultant.email = body.email.toLowerCase().trim();
    }
    if (body.name !== undefined) consultant.name = body.name;
    if (body.specialty !== undefined) consultant.specialty = body.specialty;
    if (body.bio !== undefined) consultant.bio = body.bio;
    if (body.pricePerMinute !== undefined && Number(body.pricePerMinute) >= 0) {
      consultant.pricePerMinute = Number(body.pricePerMinute);
    }
    if (
      body.commissionPercent !== undefined &&
      Number(body.commissionPercent) >= 0 &&
      Number(body.commissionPercent) <= 100
    ) {
      consultant.commissionPercent = Number(body.commissionPercent);
    }
    if (body.isActive !== undefined) consultant.isActive = !!body.isActive;
    if (body.isAvailable !== undefined) consultant.isAvailable = !!body.isAvailable;
    if (body.password && body.password.length >= 6) {
      consultant.password = await bcrypt.hash(body.password, 10);
    }

    await this.consultants.save(consultant);
    const { password, ...rest } = consultant;
    return rest;
  }

  // Define ou remove o avatar do consultor. Apenas chamado por endpoints
  // protegidos por AdminGuard. `url=null` limpa o avatar.
  async setConsultantAvatar(id: string, url: string | null) {
    const consultant = await this.consultants.findOne({ where: { id } });
    if (!consultant) throw new NotFoundException();
    consultant.avatarUrl = url;
    await this.consultants.save(consultant);
    const { password, ...rest } = consultant;
    return rest;
  }

  // -------------------- USUÁRIOS --------------------

  async listUsers(q?: string, limit = 100, offset = 0) {
    const where = q
      ? [{ name: ILike(`%${q}%`) }, { email: ILike(`%${q}%`) }]
      : undefined;
    const [items, total] = await this.users.findAndCount({
      where: where as any,
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(1, limit), 200),
      skip: Math.max(0, offset),
    });
    return {
      total,
      items: items.map((u) => {
        const { password, ...rest } = u;
        return rest;
      }),
    };
  }

  async getUserDetail(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    const [consultations, transactions] = await Promise.all([
      this.consultations.find({
        where: { clientId: id },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.transactions.find({
        where: { userId: id },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);
    const { password, ...rest } = user;
    return { user: rest, consultations, transactions };
  }

  async setUserActive(id: string, isActive: boolean) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    user.isActive = !!isActive;
    await this.users.save(user);
    return { id, isActive: user.isActive };
  }

  // -------------------- FINANCEIRO --------------------

  // -------------------- ANALYTICS (dashboards) --------------------

  async getAnalyticsOverview() {
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(now.getDate() - 29);
    start30.setHours(0, 0, 0, 0);

    // KPIs simples
    const [
      usersCount,
      activeUsers,
      consultantsCount,
      activeConsultants,
      consultationsLast30,
      pendingCommissionsRows,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { isActive: true } }),
      this.consultants.count(),
      this.consultants.count({ where: { isActive: true } }),
      this.consultations.count({
        where: { status: 'completed', startedAt: MoreThanOrEqual(start30) },
      }),
      this.getCommissionsToPay(),
    ]);

    // Receita últimos 30 dias (transações aprovadas)
    const approvedTx30 = await this.transactions.find({
      where: { status: 'approved', createdAt: MoreThanOrEqual(start30) },
    });
    const revenueLast30 = approvedTx30.reduce((s, t) => s + Number(t.gross || 0), 0);
    const ticketAvgLast30 = approvedTx30.length ? revenueLast30 / approvedTx30.length : 0;
    const pendingCommissions = pendingCommissionsRows.reduce(
      (s: number, r: any) => s + Number(r.pending || 0),
      0,
    );

    // Séries por dia (últimos 30) — preenche todos os dias
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start30);
      d.setDate(start30.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }

    const revenueRaw = await this.transactions
      .createQueryBuilder('t')
      .select(`to_char(t."createdAt"::date, 'YYYY-MM-DD')`, 'date')
      .addSelect('SUM(t.gross)', 'revenue')
      .where('t.status = :s', { s: 'approved' })
      .andWhere('t."createdAt" >= :start', { start: start30 })
      .groupBy('t."createdAt"::date')
      .getRawMany();
    const revenueMap = new Map(revenueRaw.map((r: any) => [r.date, Number(r.revenue || 0)]));
    const revenueByDay = days.map((d) => ({ date: d, revenue: +(revenueMap.get(d) || 0).toFixed(2) }));

    const consultRaw = await this.consultations
      .createQueryBuilder('c')
      .select(`to_char(c."startedAt"::date, 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('c.status = :s', { s: 'completed' })
      .andWhere('c."startedAt" >= :start', { start: start30 })
      .groupBy('c."startedAt"::date')
      .getRawMany();
    const consultMap = new Map(consultRaw.map((r: any) => [r.date, Number(r.count || 0)]));
    const consultationsByDay = days.map((d) => ({ date: d, count: consultMap.get(d) || 0 }));

    const usersRaw = await this.users
      .createQueryBuilder('u')
      .select(`to_char(u."createdAt"::date, 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u."createdAt" >= :start', { start: start30 })
      .groupBy('u."createdAt"::date')
      .getRawMany();
    const usersMap = new Map(usersRaw.map((r: any) => [r.date, Number(r.count || 0)]));
    const newUsersByDay = days.map((d) => ({ date: d, count: usersMap.get(d) || 0 }));

    // Distribuição por tipo nos últimos 30d
    const kindRaw = await this.consultations
      .createQueryBuilder('c')
      .select('c.kind', 'kind')
      .addSelect('COUNT(*)', 'count')
      .where('c.status = :s', { s: 'completed' })
      .andWhere('c."startedAt" >= :start', { start: start30 })
      .groupBy('c.kind')
      .getRawMany();
    const kindMap = new Map(kindRaw.map((r: any) => [r.kind || 'chat', Number(r.count || 0)]));
    const consultationsByKind = ['chat', 'voice', 'video'].map((k) => ({
      kind: k,
      count: kindMap.get(k) || 0,
    }));

    // Top 10 consultores por receita (geral, all-time)
    const topRaw = await this.earnings
      .createQueryBuilder('e')
      .select('e."consultantId"', 'consultantId')
      .addSelect('SUM(e."consultantAmount")', 'revenue')
      .addSelect('COUNT(*)', 'consultations')
      .groupBy('e."consultantId"')
      .orderBy('SUM(e."consultantAmount")', 'DESC')
      .limit(10)
      .getRawMany();
    const topIds = topRaw.map((r: any) => r.consultantId);
    const topConsultants = topIds.length
      ? await this.consultants.find({ where: { id: In(topIds) } })
      : [];
    const topMap = new Map(topConsultants.map((c) => [c.id, c]));
    const topConsultantsByRevenue = topRaw.map((r: any) => ({
      id: r.consultantId,
      name: topMap.get(r.consultantId)?.name || '—',
      revenue: +Number(r.revenue || 0).toFixed(2),
      consultations: Number(r.consultations || 0),
    }));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        usersCount,
        activeUsers,
        consultantsCount,
        activeConsultants,
        consultationsLast30,
        revenueLast30: +revenueLast30.toFixed(2),
        ticketAvgLast30: +ticketAvgLast30.toFixed(2),
        pendingCommissions: +pendingCommissions.toFixed(2),
      },
      revenueByDay,
      consultationsByDay,
      newUsersByDay,
      consultationsByKind,
      topConsultantsByRevenue,
    };
  }

  async getStats(period: Period = 'month') {
    const start = startOfPeriod(period);

    const txWhere: any = { status: 'approved' };
    if (start) txWhere.createdAt = MoreThanOrEqual(start);
    const approvedTx = await this.transactions.find({ where: txWhere });

    const revenueGross = approvedTx.reduce((s, t) => s + Number(t.gross || 0), 0);
    const revenueNet = approvedTx.reduce((s, t) => s + Number(t.net || 0), 0);
    const txCount = approvedTx.length;

    const earnWhere: any = {};
    if (start) earnWhere.createdAt = MoreThanOrEqual(start);
    const earningsList = await this.earnings.find({ where: earnWhere });

    const consultantEarningsTotal = earningsList.reduce(
      (s, e) => s + Number(e.consultantAmount || 0),
      0,
    );
    const platformCutTotal = earningsList.reduce(
      (s, e) => s + Number(e.platformAmount || 0),
      0,
    );

    const consultationsCount = await this.consultations.count({
      where: start
        ? { status: 'completed', startedAt: MoreThanOrEqual(start) }
        : { status: 'completed' },
    });

    return {
      period,
      revenueGross: +revenueGross.toFixed(2),
      revenueNet: +revenueNet.toFixed(2),
      transactions: txCount,
      consultations: consultationsCount,
      consultantEarningsTotal: +consultantEarningsTotal.toFixed(2),
      platformCutTotal: +platformCutTotal.toFixed(2),
    };
  }

  async getCommissionsToPay() {
    // Soma de earnings - soma de payouts já feitos.
    const earningsByConsultant = await this.earnings
      .createQueryBuilder('e')
      .select('e."consultantId"', 'consultantId')
      .addSelect('SUM(e."consultantAmount")', 'totalEarned')
      .addSelect('COUNT(*)', 'consultations')
      .groupBy('e."consultantId"')
      .getRawMany();

    const payoutsByConsultant = await this.payouts
      .createQueryBuilder('p')
      .select('p."consultantId"', 'consultantId')
      .addSelect('SUM(p.amount)', 'totalPaid')
      .groupBy('p."consultantId"')
      .getRawMany();

    const paidMap = new Map<string, number>(
      payoutsByConsultant.map((p: any) => [p.consultantId, Number(p.totalPaid || 0)]),
    );

    const consultantIds = earningsByConsultant.map((e: any) => e.consultantId);
    const consultants = consultantIds.length
      ? await this.consultants.find({ where: { id: In(consultantIds) } })
      : [];
    const consultantMap = new Map(consultants.map((c) => [c.id, c]));

    return earningsByConsultant.map((e: any) => {
      const earned = Number(e.totalEarned || 0);
      const paid = paidMap.get(e.consultantId) || 0;
      const pending = +(earned - paid).toFixed(2);
      const c = consultantMap.get(e.consultantId);
      return {
        consultantId: e.consultantId,
        consultantName: c?.name || '—',
        consultantEmail: c?.email || '—',
        consultations: Number(e.consultations || 0),
        totalEarned: +earned.toFixed(2),
        totalPaid: +paid.toFixed(2),
        pending,
      };
    });
  }

  async registerPayout(
    consultantId: string,
    amount: number,
    adminId: string,
    reference?: string,
    notes?: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor inválido');
    }
    const consultant = await this.consultants.findOne({ where: { id: consultantId } });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    const payout = this.payouts.create({
      consultantId,
      amount: Number(amount.toFixed(2)),
      reference: reference?.slice(0, 80) || null,
      notes: notes?.slice(0, 500) || null,
      paidByAdminId: adminId,
    });
    return this.payouts.save(payout);
  }

  async listPayouts(consultantId?: string) {
    const qb = this.payouts
      .createQueryBuilder('p')
      .leftJoin('consultants', 'c', 'c.id = p."consultantId"')
      .select([
        'p.id AS id',
        'p."consultantId" AS "consultantId"',
        'p.amount AS amount',
        'p.reference AS reference',
        'p.notes AS notes',
        'p."paidAt" AS "paidAt"',
        'c.name AS "consultantName"',
      ])
      .orderBy('p."paidAt"', 'DESC')
      .limit(200);
    if (consultantId) qb.where('p."consultantId" = :id', { id: consultantId });
    return qb.getRawMany();
  }

  // -------------------- TRANSAÇÕES --------------------

  async listTransactions(filters: {
    status?: string;
    method?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.from && filters.to) {
      where.createdAt = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters.from) {
      where.createdAt = MoreThanOrEqual(new Date(filters.from));
    }
    const safeLimit = Math.min(Math.max(1, Number(filters.limit) || 50), 200);
    const safeOffset = Math.max(0, Number(filters.offset) || 0);
    const [items, total] = await this.transactions.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    const userIds = Array.from(new Set(items.map((t) => t.userId)));
    const users = userIds.length
      ? await this.users.findByIds(userIds)
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      total,
      items: items.map((t) => ({
        id: t.id,
        userId: t.userId,
        userName: userMap.get(t.userId)?.name || null,
        userEmail: userMap.get(t.userId)?.email || null,
        packageId: t.packageId,
        gross: Number(t.gross),
        net: Number(t.net),
        creditsAmount: t.creditsAmount,
        method: t.method,
        status: t.status,
        gatewayId: t.gatewayId,
        creditedAt: t.creditedAt,
        createdAt: t.createdAt,
      })),
    };
  }

  // -------------------- CONSULTAS --------------------

  async listConsultations(filters: {
    status?: string;
    consultantId?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.consultantId) where.consultantId = filters.consultantId;
    if (filters.clientId) where.clientId = filters.clientId;

    const safeLimit = Math.min(Math.max(1, Number(filters.limit) || 50), 200);
    const safeOffset = Math.max(0, Number(filters.offset) || 0);
    const [items, total] = await this.consultations.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    const userIds = Array.from(new Set(items.map((c) => c.clientId)));
    const consIds = Array.from(new Set(items.map((c) => c.consultantId)));
    const [users, cons] = await Promise.all([
      userIds.length ? this.users.findByIds(userIds) : Promise.resolve([]),
      consIds.length ? this.consultants.findByIds(consIds) : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const consMap = new Map(cons.map((c) => [c.id, c.name]));

    return {
      total,
      items: items.map((c) => ({
        id: c.id,
        clientId: c.clientId,
        clientName: userMap.get(c.clientId) || null,
        consultantId: c.consultantId,
        consultantName: consMap.get(c.consultantId) || null,
        status: c.status,
        minutesUsed: Number(c.minutesUsed || 0),
        creditsUsed: Number(c.creditsUsed || 0),
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        createdAt: c.createdAt,
      })),
    };
  }

  async getConsultationMessages(id: string) {
    const consultation = await this.consultations.findOne({ where: { id } });
    if (!consultation) throw new NotFoundException();
    const messages = await this.messages.find({
      where: { consultationId: id },
      order: { createdAt: 'ASC' },
    });
    return {
      consultationId: id,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content,
        type: (m as any).type || 'text',
        mediaUrl: (m as any).mediaUrl || null,
        createdAt: m.createdAt,
      })),
    };
  }
}

