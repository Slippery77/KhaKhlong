import {
  IsString,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateIngredientDto {
  @ApiPropertyOptional({
    description:
      'ชื่อวัตถุดิบ (ห้ามซ้ำภายในร้านสำหรับวัตถุดิบที่ยังใช้งานอยู่)',
    example: 'เนื้อหมูสันนอกเกรด A',
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'หน่วยที่ใช้เก็บสต็อก (เช่น กรัม, ฟอง, ชิ้น, มิลลิลิตร)',
    example: 'กรัม',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  stock_unit?: string;

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
    description: 'อัตราแปลงหน่วยซื้อเป็นหน่วยเก็บสต็อก',
    example: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  purchase_to_stock_ratio?: number;

  @ApiPropertyOptional({
    description: 'เกณฑ์แจ้งเตือนสต็อกต่ำ',
    example: 600,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  low_stock_threshold?: number;

  @ApiPropertyOptional({
    description: 'สถานะเปิดใช้งาน',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
