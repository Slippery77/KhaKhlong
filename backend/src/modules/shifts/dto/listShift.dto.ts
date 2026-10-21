import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, Matches, IsIn, IsInt, Min , Max } from "class-validator";

export class ListShiftsQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ enum: ['open', 'closed_auto', 'pending_verification', 'escalated', 'verified'] })
  @IsOptional() @IsIn(['open', 'closed_auto', 'pending_verification', 'escalated', 'verified'])
  status?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 30, default: 30, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}