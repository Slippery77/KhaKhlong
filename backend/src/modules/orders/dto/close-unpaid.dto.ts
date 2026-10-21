import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม (ถ้ามี)',
    example: 'ลูกค้าออกจากร้านโดยไม่จ่ายเงิน',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
