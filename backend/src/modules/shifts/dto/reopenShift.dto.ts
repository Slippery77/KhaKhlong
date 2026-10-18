import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ReopenShiftDto {
  @ApiProperty({ example: 'พนักงานกดปิดกะผิดตอนบ่าย', maxLength: 500 })
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}