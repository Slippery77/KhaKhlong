import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({
    description: 'เลขชั้น (ต้องไม่ซ้ำกันภายในร้าน)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  floor_no: number;

  @ApiPropertyOptional({
    description: 'ชื่อชั้น (ไม่บังคับ เช่น "ชั้นล่าง") เว้นว่างได้',
    example: 'ชั้นบน',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    description:
      'จำนวนโต๊ะที่ "ตั้งไว้" สำหรับชั้นนี้ (เป้าหมาย ระบบไม่สร้างโต๊ะให้อัตโนมัติ — เพิ่มทีละตัวในหน้าชั้น)',
    example: 5,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  table_count: number;
}
