import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecordStockCountDto {
  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  ingredient_id: string;

  @ApiProperty({
    description: 'ยอดที่นับได้จริงสิ้นวัน (หน่วยสต็อก stock_unit) ต้องไม่ติดลบ',
    example: 850,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  counted_quantity: number;

  @ApiPropertyOptional({
    description:
      'หมายเหตุเพิ่มเติม (ระบบจะบันทึกยอดระบบและยอดนับต่อท้ายให้อัตโนมัติ)',
    example: 'นับสต็อกปิดร้านประจำวัน',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
