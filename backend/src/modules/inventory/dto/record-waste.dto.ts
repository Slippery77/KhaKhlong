import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export type WasteReason = 'expired' | 'spoiled' | 'dropped' | 'other';

export class RecordWasteDto {
  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  ingredient_id: string;

  @ApiProperty({
    description:
      'จำนวนของเสียในหน่วยสต็อก (stock_unit) ต้องมากกว่า 0 (ระบบจะหักออกเป็นค่าลบให้อัตโนมัติ)',
    example: 200,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description:
      'สาเหตุของเสีย: expired (หมดอายุ), spoiled (เน่าเสีย), dropped (ทำตก/เสียหาย), other (อื่น ๆ)',
    enum: ['expired', 'spoiled', 'dropped', 'other'],
    example: 'spoiled',
  })
  @IsIn(['expired', 'spoiled', 'dropped', 'other'], {
    message:
      'waste_reason ต้องเป็น expired, spoiled, dropped หรือ other เท่านั้น',
  })
  @IsNotEmpty()
  waste_reason: WasteReason;

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม',
    example: 'ตู้เย็นดับช่วงกลางคืน เนื้อหมูมีกลิ่น',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
