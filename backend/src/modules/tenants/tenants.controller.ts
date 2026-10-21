import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { AnyAuthenticated, RequirePermissions } from '../auth/guards/permissions.decorator';
import { TenantsService } from './tenants.service';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateTenantDTO } from './dto/update-tenant.dto';

@ApiBearerAuth()
@ApiTags('store')
@Controller('store')
export class TenantsController {
    constructor(private readonly service:TenantsService){}
    
    @ApiOperation({
        summary:"",
        description:""
    })
    @ApiNotFoundResponse({description:'ไม่พบร้านอาหาร'})
    @AnyAuthenticated()
    @Get()
    async getStore(){
        return this.service.listStore();
    }

    @RequirePermissions('store:configure')
    @Patch()
    async updateStoreDetail(@Body() dto:UpdateTenantDTO){
        return this.service.updateStore(dto);
    }
}
