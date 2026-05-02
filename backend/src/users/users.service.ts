import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { Credit } from '../database/entities/credit.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Credit)
    private creditsRepository: Repository<Credit>,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password, ...rest } = user;
    return rest;
  }

  async updateProfile(
    id: string,
    body: { name?: string; email?: string; phone?: string; birthDate?: string },
  ) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (body.email && body.email !== user.email) {
      const exists = await this.usersRepository.findOne({ where: { email: body.email } });
      if (exists) throw new ConflictException('E-mail já está em uso');
      user.email = body.email;
    }
    if (body.name !== undefined) user.name = body.name;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.birthDate !== undefined) {
      user.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    }

    await this.usersRepository.save(user);
    const { password, ...rest } = user;
    return rest;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    return { ok: true };
  }

  async addCredits(userId: string, amount: number, pricePerCredit: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const totalPrice = amount * pricePerCredit;

    user.credits = Number(user.credits) + Number(amount);
    await this.usersRepository.save(user);

    const credit = this.creditsRepository.create({
      userId,
      amount,
      pricePerCredit,
      totalPrice,
      type: 'purchase',
      status: 'completed',
    });

    await this.creditsRepository.save(credit);

    const { password, ...rest } = user;
    return rest;
  }

  async deductCredits(userId: string, amount: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (Number(user.credits) < Number(amount)) {
      throw new BadRequestException('Créditos insuficientes');
    }

    user.credits = Number(user.credits) - Number(amount);
    await this.usersRepository.save(user);

    const credit = this.creditsRepository.create({
      userId,
      amount: -amount,
      pricePerCredit: 0,
      totalPrice: 0,
      type: 'usage',
      status: 'completed',
    });

    await this.creditsRepository.save(credit);

    const { password, ...rest } = user;
    return rest;
  }

  async getCreditHistory(userId: string) {
    return this.creditsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
