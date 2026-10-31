import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsNumber, Min, Max, IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class UpdateMenuItemDTO {
    @ApiPropertyOptional({ description: 'ชื่อเมนู', example: 'ข้าวผัดกุ้ง', maxLength: 150 })
    @ValidateIf((o) => o.name !== undefined)        // ไม่ส่งก็ข้าม ส่ง null มาต้องตรวจ
    @IsString() @IsNotEmpty() @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'คำอธิบาย ส่ง null เพื่อล้าง', example: 'ใส่ไข่', nullable: true })
    @IsOptional()                                   // ช่องนี้ null ได้ (DB nullable)
    @IsString() @MaxLength(1000)
    description?: string | null;

    @ApiPropertyOptional({ description: 'ลิงก์รูปภาพเมนู หรือ Data URL (ส่ง null เพื่อลบรูป)', nullable: true })
    @IsOptional()
    @IsString() @MaxLength(500000)
    image_url?: string | null;

    @ApiPropertyOptional({ description: 'ราคา', example: 80 })
    @ValidateIf((o) => o.price !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99)
    price?: number;

    @ApiPropertyOptional({ description: 'ย้ายไปหมวดอื่น', format: 'uuid' })
    @ValidateIf((o) => o.category_id !== undefined)
    @IsUUID()
    category_id?: string;
}
