import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockCountItemDto {
  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  ingredient_id: string;

  @ApiProperty({
    description: 'ยอดที่นับได้จริง (หน่วยสต็อก stock_unit) ต้องไม่ติดลบ',
    example: 850,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  counted_quantity: number;

  @ApiPropertyOptional({
    description: 'หมายเหตุของรายการนี้ (ระบบเติมยอดระบบและยอดนับต่อท้ายให้เอง)',
    example: 'นับปิดร้าน',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RecordStockCountBatchDto {
  @ApiProperty({
    description:
      'รายการที่นับได้จริงตอนจบวัน — ส่งเฉพาะวัตถุดิบที่มีการนับ ไม่ต้องส่งครบทุกตัว',
    type: [StockCountItemDto],
    minItems: 1,
    maxItems: 200,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'ต้องมีรายการนับอย่างน้อย 1 รายการ' })
  @ArrayMaxSize(200, { message: 'บันทึกได้ครั้งละไม่เกิน 200 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => StockCountItemDto)
  items: StockCountItemDto[];
}
