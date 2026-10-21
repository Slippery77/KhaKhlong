import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class FloorDto {
  @ApiProperty({
    description: 'รหัสชั้น (UUID)',
    format: 'uuid',
    example: 'c1000000-0000-0000-0000-000000000001',
  })
  floor_id: string;

  @ApiProperty({
    description: 'เลขชั้น',
    example: 2,
  })
  floor_no: number;

  @ApiPropertyOptional({
    description: 'ชื่อชั้น (null = ไม่ได้ตั้งชื่อ)',
    example: 'ชั้นบน',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'จำนวนโต๊ะที่ "ตั้งไว้" ตอนสร้าง/แก้ไขชั้น (เป้าหมาย ไม่ใช่จำนวนจริง)',
    example: 5,
  })
  table_count: number;

  @ApiProperty({
    description: 'จำนวนโต๊ะที่มีจริงในชั้นนี้ (นับจาก dining_tables)',
    example: 3,
  })
  actual_table_count: number;

  @ApiProperty({
    description: 'เวลาที่สร้างชั้น',
    example: '2026-10-04T08:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'เวลาที่อัปเดตข้อมูลล่าสุด',
    example: '2026-10-04T08:00:00.000Z',
  })
  updated_at: string;
}

export class FloorResponseDto {
  @ApiProperty({ description: 'สถานะผลลัพธ์', example: 'success' })
  status: string;

  @ApiProperty({ description: 'ข้อมูลชั้น', type: FloorDto })
  data: FloorDto;
}

/** ใช้ตอน DELETE /floors/:id ที่ไม่คืนข้อมูลชั้นกลับมา */
export class FloorActionResponseDto extends PartialType(FloorResponseDto) {
  @ApiPropertyOptional({ description: 'ข้อความยืนยันผล', example: 'ลบชั้นสำเร็จ' })
  message?: string;
}
