import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../database/entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [PricingController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
