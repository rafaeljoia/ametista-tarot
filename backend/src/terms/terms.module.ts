import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsVersion } from '../database/entities/terms-version.entity';
import { TermsAcceptance } from '../database/entities/terms-acceptance.entity';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';
import { TermsAdminController } from './terms.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TermsVersion, TermsAcceptance])],
  controllers: [TermsController, TermsAdminController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
