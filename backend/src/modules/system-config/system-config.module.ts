import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigRepository } from './system-config.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports:[AuthModule],
  providers: [SystemConfigService,SystemConfigRepository],
  controllers: [SystemConfigController],
  exports:[SystemConfigService]
})
export class SystemConfigModule {}
