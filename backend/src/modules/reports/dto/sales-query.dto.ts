import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SalesQueryDto {
  @IsOptional()
  @IsIn(['TODAY', 'WEEK', 'MONTH'])
  period?: 'TODAY' | 'WEEK' | 'MONTH' = 'WEEK';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;
}
