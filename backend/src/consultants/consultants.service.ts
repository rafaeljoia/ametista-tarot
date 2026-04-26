import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultant } from '../database/entities/consultant.entity';

@Injectable()
export class ConsultantsService {
  constructor(
    @InjectRepository(Consultant)
    private consultantsRepository: Repository<Consultant>,
  ) {}

  async findAll() {
    return this.consultantsRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'specialty', 'rating', 'pricePerMinute', 'isAvailable', 'consultationsCount'],
    });
  }

  async findById(id: string) {
    const consultant = await this.consultantsRepository.findOne({
      where: { id },
    });

    if (!consultant) {
      throw new NotFoundException('Consultor não encontrado');
    }

    return consultant;
  }

  async updateAvailability(id: string, isAvailable: boolean) {
    await this.consultantsRepository.update(id, { isAvailable });
    return this.findById(id);
  }
}
