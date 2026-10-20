import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
    providers:[TenantsService, TenantsRepository],
    exports:[TenantsService],
    controllers: [TenantsController]
})
export class TenantsModule {}