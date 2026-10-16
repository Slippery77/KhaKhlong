import { ApiPropertyOptional } from "@nestjs/swagger";
import { ValidateIf, IsString, IsNotEmpty, MaxLength, Min ,Max, IsNumber} from "class-validator";

export class UpdateModifierItemDTO {
    @ApiPropertyOptional({ example: 'ไข่ดาว', maxLength: 100 })
    @ValidateIf(o => o.name !== undefined)
    @IsString() 
    @IsNotEmpty() 
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 10 })   // ← example เป็น number ไม่ใช่ '10'
    @ValidateIf(o => o.price_delta !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 }) 
    @Min(0) 
    @Max(99999999.99)
    price_delta?: number;
}