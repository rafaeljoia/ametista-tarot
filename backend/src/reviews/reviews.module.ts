import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from '../database/entities/review.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Consultant } from '../database/entities/consultant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Consultation, Consultant])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
