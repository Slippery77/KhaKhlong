import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ยกเลิกทั้งบิล (ลูกค้าเปลี่ยนใจไม่กิน) — void รายการที่ยังไม่เสิร์ฟทั้งหมด
 * แล้วปิดบิลเป็น voided_all (หรือ empty ถ้าไม่มีรายการ) ใน transaction เดียว
 */
export class CancelOrderDto {
  @ApiProperty({
    description:
      'PIN 6 หลักของผู้จัดการ/เจ้าของร้านที่อนุมัติ (ต้องมีสิทธิ์ order:close_unpaid และ void:approve)',
    example: '246810',
  })
  @Matches(/^\d{6}$/, { message: 'PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก' })
  approverPin!: string;

  @ApiProperty({
    description: 'เหตุผลที่ยกเลิกทั้งบิล (บันทึกใน void_reason ของทุกรายการ)',
    example: 'ลูกค้าเปลี่ยนใจไม่กิน',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม',
    example: 'ยังไม่เสิร์ฟเลย',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
