import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** ส่ง qrData หรือ imageBase64 อย่างใดอย่างหนึ่ง (ตรวจใน service) */
export class VerifySlipDTO {
  @ApiPropertyOptional({
    example: '0041000600000101030040220013071152533APM077365102TH91048134',
    description:
      'ข้อความจาก QR มุมขวาล่างของสลิป (สแกนด้วยเครื่องสแกนหรือกล้อง) ใช้เน็ตน้อยที่สุด',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  qrData?: string;

  @ApiPropertyOptional({
    description:
      'รูปสลิปแบบ base64 (มีหรือไม่มี prefix data:image/...;base64, ก็ได้) JPG/PNG/WEBP ไม่เกินประมาณ 1.4MB',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1_900_000)
  imageBase64?: string;
}
