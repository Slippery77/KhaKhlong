import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const AUDIT_ACTION_TYPES = [
  'login_success',
  'login_failed',
  'logout',
  'menu_price_updated',
  'role_changed',
  'table_status_changed',
  'config_updated',
  'user_created',
  'user_deactivated',
  'user_reactivated',
  'pin_changed',
  'password_changed',
  'pin_locked',
  'order_closed_unpaid',
  'shift_reopened',
  'inventory_adjusted',
  'tenant_updated',
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'หมายเลขหน้า', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้า', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'ประเภทเหตุการณ์ (action_type)',
    enum: AUDIT_ACTION_TYPES,
  })
  @IsOptional()
  @IsIn(AUDIT_ACTION_TYPES)
  action_type?: AuditActionType;

  @ApiPropertyOptional({ description: 'รหัสผู้ใช้ (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'ตั้งแต่วันที่ (YYYY-MM-DD หรือ ISO)', example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ถึงวันที่ (YYYY-MM-DD หรือ ISO)', example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

