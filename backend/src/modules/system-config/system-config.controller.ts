import { Controller,Get,Req,Patch,Param,Body } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiResponse,
    ApiOkResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { AnyAuthenticated } from '../auth/guards/permissions.decorator';
import { UpdateConfigDto } from './dto/updateConfig.dto';
import { ConfigItemResponseDto, ConfigListResponseDto } from './dto/config-response.dto';

@ApiBearerAuth()
@ApiTags('system-config')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('system-config')
export class SystemConfigController {
    constructor(private readonly service:SystemConfigService){}

    @ApiOperation({
        summary: 'ดึง config ทั้งหมดของร้าน',
        description:
            'คืน config ครบ 9 key เสมอ พร้อม definition (valueType, min/max, allowedValues, ownerOnly) ' +
            'ให้ frontend ใช้สร้างฟอร์มและเปิด/ปิด feature เช่น kds_enabled, require_all_served_before_payment ' +
            'ถ้าร้านยังไม่มีแถว config จะใช้ default_value จาก config_definitions ' +
            'tenant มาจาก token (app_tenant_id() + RLS) ไม่รับจาก client ทุก role อ่านได้',
    })
    @ApiOkResponse({ description: 'ดึง config สำเร็จ', type: ConfigListResponseDto })
    @AnyAuthenticated()
    @Get()
    async listConfig(){
        return this.service.getAll();
    }

    @ApiOperation({
        summary: 'แก้ค่า config ทีละ key',
        description:
            'สิทธิ์ขึ้นกับ ownerOnly ของ key: true ต้องมี tax:configure (Owner), ' +
            'false ต้องมี config:edit_operational (Owner, Manager) ส่วน Employee ได้ 403 ทุก key ' +
            'trigger ในฐานข้อมูลจะตรวจชนิดและช่วงค่า เติม updated_by และเขียน audit log ' +
            'response มีรูปแบบเดียวกับ item ใน GET /system-config',
    })
    @ApiParam({ name: 'key', description: 'config key ที่ต้องการแก้', example: 'kds_enabled' })
    @ApiBody({ type: UpdateConfigDto })
    @ApiOkResponse({ description: 'แก้ค่าสำเร็จ', type: ConfigItemResponseDto })
    @ApiBadRequestResponse({
        description:
            'value ไม่ใช่ string/number/boolean, ชนิดหรือช่วงค่าไม่ถูกต้อง (trigger), ' +
            'หรือเปิด VAT โดยยังไม่ได้ตั้ง tax_id',
    })
    @ApiForbiddenResponse({
        description: 'ไม่มีสิทธิ์ tax:configure (key ที่ ownerOnly) หรือ config:edit_operational',
    })
    @ApiNotFoundResponse({
        description: 'ไม่พบ key ใน config_definitions หรือร้านนี้ยังไม่มีแถวของ key นี้ใน system_config',
    })
    @AnyAuthenticated()
    @Patch(':key')
    async update(@Req() req, @Param('key') key: string, @Body() dto: UpdateConfigDto) {
        const user = req.user
        return this.service.update(user,key, dto);
    }
}
