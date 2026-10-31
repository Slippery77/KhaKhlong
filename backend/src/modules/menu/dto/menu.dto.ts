import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuItemDTO {
    
    @ApiProperty({ description: 'ชื่อเมนู', example: 'ข้าวผัดกุ้ง', maxLength: 150 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @ApiPropertyOptional({ description: 'คำอธิบายเมนู', example: 'ข้าวผัดกุ้งสด ใส่ไข่', nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string | null;

    @ApiPropertyOptional({ description: 'ลิงก์รูปภาพเมนู หรือ Data URL ของรูปภาพ', nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500000)
    image_url?: string | null;

    @ApiProperty({ description: 'ราคาที่ลูกค้าจ่าย หน่วยบาท ทศนิยม 2 ตำแหน่ง', example: 80 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99999999.99)
    price!: number;

    @ApiProperty({description:'รหัสหมวดหมู่',example:'3f1c2a4e-8b7d-4e21-9a6f-2c5d8e9f0a1b'})
    @IsUUID()
    @IsNotEmpty()
    category_id!:string;
}
