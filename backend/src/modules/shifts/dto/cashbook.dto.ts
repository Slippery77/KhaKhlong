import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class CashBookQueryDTO{
    @ApiPropertyOptional({ example: '2026-10-18', description: 'วันทำการ (ไม่ส่ง = วันนี้)' })
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date ต้องเป็น YYYY-MM-DD' })
    date?: string;
}