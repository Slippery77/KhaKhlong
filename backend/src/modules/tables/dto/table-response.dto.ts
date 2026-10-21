import { ApiProperty } from '@nestjs/swagger';

export class DiningTableDto {
  @ApiProperty({
    description: 'รหัสโต๊ะ (UUID)',
    format: 'uuid',
    example: 'a1000000-0000-0000-0000-000000000001',
  })
  table_id: string;

  @ApiProperty({
    description: 'เลขหรือชื่อโต๊ะ',
    example: 'T01',
  })
  table_number: string;

  @ApiProperty({
    description: 'จำนวนที่นั่ง',
    example: 4,
  })
  capacity: number;

  @ApiProperty({
    description: 'รหัสชั้นที่โต๊ะสังกัด (FK ไปหาตาราง floors)',
    format: 'uuid',
    example: 'c1000000-0000-0000-0000-000000000001',
  })
  floor_id: string;

  @ApiProperty({
    description: 'เลขชั้น (JOIN จากตาราง floors ไว้แสดงผล)',
    example: 1,
    nullable: true,
  })
  floor_no: number | null;

  @ApiProperty({
    description: 'สถานะของโต๊ะ (available = ว่าง, occupied = มีลูกค้า/มีบิล, out_of_service = ปิดใช้งาน)',
    enum: ['available', 'occupied', 'out_of_service'],
    example: 'available',
  })
  status: string;

  @ApiProperty({
    description: 'เวลาที่สร้างโต๊ะ',
    example: '2026-10-04T08:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'เวลาที่อัปเดตข้อมูลล่าสุด',
    example: '2026-10-04T08:00:00.000Z',
  })
  updated_at: string;
}

export class DiningTableResponseDto {
  @ApiProperty({
    description: 'สถานะผลลัพธ์',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'ข้อมูลโต๊ะ',
    type: DiningTableDto,
  })
  data: DiningTableDto;
}
