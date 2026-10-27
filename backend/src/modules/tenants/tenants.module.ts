import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';

@Module({
    providers:[TenantsService, TenantsRepository],
    exports:[TenantsService],
    controllers: [TenantsController, PublicTenantsController]
})
export class TenantsModule {}