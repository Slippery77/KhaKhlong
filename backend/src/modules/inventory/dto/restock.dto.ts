import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RestockDto {
  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  ingredient_id: string;

  @ApiProperty({
    description:
      'จำนวนที่รับเข้าในหน่วยสต็อก (stock_unit เช่น กรัม, ฟอง) ต้องมากกว่า 0',
    example: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม เช่น เลขที่ใบเสร็จ หรือชื่อซัพพลายเออร์',
    example: 'ซื้อจากตลาดสด ใบเสร็จ #INV-992',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
