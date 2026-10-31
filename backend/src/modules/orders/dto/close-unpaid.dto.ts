import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseUnpaidDto {
  @ApiProperty({
    description: 'เหตุผลการปิดบิลโดยไม่เก็บเงิน (voided_all, empty, walkout)',
    example: 'walkout',
    enum: ['voided_all', 'empty', 'walkout'],
  })
  @IsNotEmpty()
  @IsIn(['voided_all', 'empty', 'walkout'])
  closeReason!: 'voided_all' | 'empty' | 'walkout';

  @ApiProperty({
    description:
      'PIN 6 หลักของผู้จัดการ/เจ้าของร้านที่อนุมัติ (ต้องมีสิทธิ์ order:close_unpaid)',
    example: '246810',
  })
  @Matches(/^\d{6}$/, { message: 'PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก' })
  approverPin!: string;

  @ApiPropertyOptional({
    description:
      'หมายเหตุเพิ่มเติม — บังคับเมื่อ walkout และบิลยังมีรายการ (ใช้เป็นหลักฐานใน audit)',
    example: 'ลูกค้าออกจากร้านโดยไม่จ่ายเงิน',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
