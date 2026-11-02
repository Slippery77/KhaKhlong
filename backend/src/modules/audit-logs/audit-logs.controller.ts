import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/guards/permissions.decorator';

@ApiBearerAuth()
@ApiTags('Audit Logs')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ audit_log:view (จำกัดเฉพาะ Owner และ Manager)' })
@Controller('audit-logs')
@UseGuards(PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @ApiOperation({
    summary: 'ดึงรายการ Audit Log ของร้าน',
    description:
      'เข้าถึงได้เฉพาะผู้มีสิทธิ์ audit_log:view (Owner, Manager ตาม AUD-05) ' +
      'กรองตาม tenant_id เสมอ รองรับ pagination, filter ตาม action_type, user_id, และช่วงเวลา',
  })
  @Get()
  @RequirePermissions('audit_log:view')
  async getAuditLogs(@Query() query: AuditQueryDto) {
    const data = await this.service.getAuditLogs(query);
    return {
      status: 'success',
      data,
    };
  }
}
