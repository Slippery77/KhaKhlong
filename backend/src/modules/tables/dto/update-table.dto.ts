import { IsOptional, IsString, IsInt, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto {
  @ApiPropertyOptional({
    description: 'เลขหรือชื่อโต๊ะใหม่ (ไม่ซ้ำกับโต๊ะอื่นในร้าน)',
    example: 'T01-A',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  tableNumber?: string;

  @ApiPropertyOptional({
    description: 'จำนวนที่นั่งต่อโต๊ะ (ต้องมากกว่า 0)',
    example: 6,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: 'ย้ายโต๊ะไปชั้นอื่น (floor_id จาก GET /floors) — ชั้นต้องมีอยู่จริง',
    example: 'c1000000-0000-0000-0000-000000000001',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  floorId?: string;
}
