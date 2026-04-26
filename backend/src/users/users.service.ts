import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    return user;
  }

  async addCredits(userId: string, amount: number, pricePerCredit: number) {
    const user = await this.findById(userId);
    const totalPrice = amount * pricePerCredit;

    user.credits += amount;
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

    return user;
  }

  async deductCredits(userId: string, amount: number) {
    const user = await this.findById(userId);

    if (user.credits < amount) {
      throw new Error('Créditos insuficientes');
    }

    user.credits -= amount;
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

    return user;
  }

  async getCreditHistory(userId: string) {
    return this.creditsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
