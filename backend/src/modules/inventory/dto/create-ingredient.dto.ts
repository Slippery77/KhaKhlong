import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateIngredientDto {
  @ApiProperty({
    description:
      'ชื่อวัตถุดิบ (ห้ามซ้ำภายในร้านสำหรับวัตถุดิบที่ยังใช้งานอยู่)',
    example: 'เนื้อหมูสันนอก',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'หน่วยที่ใช้เก็บสต็อก (เช่น กรัม, ฟอง, ชิ้น, มิลลิลิตร)',
    example: 'กรัม',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  stock_unit: string;

  @ApiPropertyOptional({
    description: 'หน่วยที่ใช้ซื้อ (เช่น กิโลกรัม, แผง)',
    example: 'กิโลกรัม',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  purchase_unit?: string;

  @ApiPropertyOptional({
    description:
      'อัตราแปลงหน่วยซื้อเป็นหน่วยเก็บสต็อก (เช่น 1 กก. = 1000 กรัม ให้กรอก 1000)',
    example: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  purchase_to_stock_ratio?: number;

  @ApiPropertyOptional({
    description:
      'เกณฑ์แจ้งเตือนสต็อกต่ำ (แจ้งเตือนเมื่อสต็อกเหลือน้อยกว่าค่านี้)',
    example: 500,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  low_stock_threshold?: number;
}
