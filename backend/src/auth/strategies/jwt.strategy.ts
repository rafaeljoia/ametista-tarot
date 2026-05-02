import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Consultant } from '../../database/entities/consultant.entity';
import { Admin } from '../../database/entities/admin.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Consultant)
    private consultantsRepository: Repository<Consultant>,
    @InjectRepository(Admin)
    private adminsRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    if (payload.role === 'admin') {
      const admin = await this.adminsRepository.findOne({
        where: { id: payload.sub },
      });
      if (!admin || !admin.isActive) return null;
      const { password, ...rest } = admin;
      return { ...rest, role: 'admin' };
    }

    if (payload.role === 'consultant') {
      const consultant = await this.consultantsRepository.findOne({
        where: { id: payload.sub },
      });
      if (!consultant) return null;
      const { password, ...rest } = consultant;
      return { ...rest, role: 'consultant' };
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) return null;
    const { password, ...rest } = user;
    return { ...rest, role: 'user' };
  }
}
