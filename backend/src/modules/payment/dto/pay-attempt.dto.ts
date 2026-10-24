import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PayAttemptDTO {
  @ApiPropertyOptional({
    example: 500,
    description: 'เงินสดที่รับมา บังคับเมื่อ attempt เป็นเงินสด และห้ามส่งเมื่อเป็น QR',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cashReceived?: number;
}