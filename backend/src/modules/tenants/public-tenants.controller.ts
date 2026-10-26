import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/guards/public.decorator';
import { TenantsService } from './tenants.service';

/**
 * endpoint สาธารณะ (ไม่ต้องมี token) สำหรับหน้าแรกของเว็บ
 * ใช้ตรวจว่ารหัสร้านที่ผู้ใช้พิมพ์มีอยู่จริงก่อนพาไปหน้าร้านนั้น
 * ไม่คืนชื่อร้าน/ข้อมูลอื่น เพื่อลดการไล่เดารายชื่อร้าน (tenant enumeration)
 */
@ApiTags('public')
@Controller('public/tenants')
export class PublicTenantsController {
    constructor(private readonly service: TenantsService) {}

    @ApiOperation({
        summary: 'ตรวจสอบรหัสร้านก่อนเข้าสู่ระบบ',
        description:
            'หน้า store finder ใช้ endpoint นี้เพื่อบอกว่าพิมพ์รหัสร้านถูกหรือไม่ ' +
            'ตอบ 200 เสมอพร้อม { exists, active } เพื่อไม่ให้ client แยกแยะ error ได้ ' +
            'และจำกัด 20 ครั้ง/นาที ต่อ IP',
    })
    @ApiParam({ name: 'slug', description: 'รหัสร้าน (tenant_slug)', example: 'krua-ban' })
    @ApiOkResponse({ description: 'คืน { status, data: { slug, exists, active } }' })
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @Public()
    @Get(':slug')
    lookup(@Param('slug') slug: string) {
        return this.service.lookupPublicTenant(slug);
    }
}
