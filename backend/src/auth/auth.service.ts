import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TermsService } from '../terms/terms.service';
import { MailService } from '../mail/mail.service';

const RESET_TOKEN_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Consultant)
    private consultantsRepository: Repository<Consultant>,
    @InjectRepository(PasswordResetToken)
    private resetRepo: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private termsService: TermsService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto, ctx?: { ip?: string; userAgent?: string }) {
    const { email, password, name, phone, birthDate, acceptedTermsVersionId } = registerDto;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) throw new ConflictException('E-mail já registrado');

    // Resolve a versão dos termos a registrar
    let termsVersionId = acceptedTermsVersionId || null;
    if (termsVersionId) {
      try {
        await this.termsService.getById(termsVersionId);
      } catch {
        termsVersionId = null;
      }
    }
    if (!termsVersionId) {
      const active = await this.termsService.getActiveOrNull();
      termsVersionId = active?.id ?? null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email, password: hashedPassword, name, phone,
      birthDate: birthDate ? new Date(birthDate) : null,
      credits: 0,
    });

    await this.usersRepository.save(user);

    if (termsVersionId) {
      try {
        await this.termsService.recordAcceptance({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          termsVersionId,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
        });
      } catch (err: any) {
        this.logger.warn(
          `Não foi possível registrar aceitação de termos para ${user.email}: ${err?.message}`,
        );
      }
    }

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: 'user' }),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: 'user' }),
    };
  }

  async loginConsultant(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const consultant = await this.consultantsRepository.findOne({ where: { email } });

    if (!consultant || !(await bcrypt.compare(password, consultant.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const { password: _, ...consultantWithoutPassword } = consultant;
    return {
      consultant: consultantWithoutPassword,
      access_token: this.jwtService.sign({
        sub: consultant.id,
        email: consultant.email,
        role: 'consultant',
      }),
    };
  }

  async validateUser(userId: string) {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  // ============================================================
  // Esqueci minha senha — fluxo unificado para user e consultant
  // ============================================================

  /**
   * Inicia fluxo de redefinição. Sempre retorna sucesso (não vaza se o e-mail
   * existe ou não na base) — é a recomendação OWASP.
   */
  async forgotPassword(
    email: string,
    role: 'user' | 'consultant' = 'user',
    ctx?: { ip?: string },
  ) {
    const account = await this.findAccountByEmail(email, role);
    if (!account) {
      this.logger.log(`forgotPassword: e-mail não cadastrado (${role}) ${email}`);
      return { ok: true };
    }

    // Invalida tokens anteriores ainda válidos para essa conta
    await this.resetRepo.update(
      { userId: account.id, role, usedAt: undefined as any },
      { usedAt: new Date() },
    ).catch(() => undefined);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    const rec = this.resetRepo.create({
      role,
      userId: account.id,
      email: account.email,
      tokenHash,
      expiresAt,
      requestedFromIp: ctx?.ip ?? null,
    });
    await this.resetRepo.save(rec);

    const base = process.env.FRONTEND_URL || 'https://ametista.braviaglobal.com.br';
    const link = `${base}/reset-password?token=${rawToken}&role=${role}`;

    try {
      await this.mailService.sendPasswordReset({
        to: account.email,
        name: account.name,
        link,
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao enviar e-mail de redefinição: ${err?.message}`);
    }

    return { ok: true };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (!rawToken || rawToken.length < 32) {
      throw new BadRequestException('Token inválido');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Senha deve ter ao menos 6 caracteres');
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const rec = await this.resetRepo.findOne({ where: { tokenHash } });
    if (!rec) throw new BadRequestException('Token inválido ou expirado');
    if (rec.usedAt) throw new BadRequestException('Token já utilizado');
    if (rec.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token expirado, solicite um novo');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    if (rec.role === 'consultant') {
      const c = await this.consultantsRepository.findOne({ where: { id: rec.userId } });
      if (!c) throw new BadRequestException('Conta não encontrada');
      c.password = hashed;
      await this.consultantsRepository.save(c);
    } else {
      const u = await this.usersRepository.findOne({ where: { id: rec.userId } });
      if (!u) throw new BadRequestException('Conta não encontrada');
      u.password = hashed;
      await this.usersRepository.save(u);
    }

    rec.usedAt = new Date();
    await this.resetRepo.save(rec);

    return { ok: true, role: rec.role };
  }

  private async findAccountByEmail(
    email: string,
    role: 'user' | 'consultant',
  ): Promise<{ id: string; email: string; name: string } | null> {
    if (role === 'consultant') {
      const c = await this.consultantsRepository.findOne({ where: { email } });
      return c ? { id: c.id, email: c.email, name: c.name } : null;
    }
    const u = await this.usersRepository.findOne({ where: { email } });
    return u ? { id: u.id, email: u.email, name: u.name } : null;
  }
}
