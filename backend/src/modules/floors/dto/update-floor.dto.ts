import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFloorDto {
  @ApiPropertyOptional({
    description: 'เลขชั้นใหม่ (โต๊ะผูกด้วย floor_id จึงไม่กระทบข้อมูลโต๊ะ)',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  floor_no?: number;

  @ApiPropertyOptional({
    description: 'ชื่อชั้นใหม่ — ส่งเป็นค่าว่าง ("") เพื่อล้างชื่อออก',
    example: 'ชั้นล่าง',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'จำนวนโต๊ะที่ตั้งไว้สำหรับชั้นนี้',
    example: 8,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  table_count?: number;
}
