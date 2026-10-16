import { ApiPropertyOptional } from "@nestjs/swagger";
import { ValidateIf, IsString, IsNotEmpty, MaxLength, IsIn, IsBoolean } from "class-validator";

export class UpdateModifierGroupDTO {
    @ApiPropertyOptional({ example: 'ระดับความเผ็ด', maxLength: 100 })
    @ValidateIf(o => o.name !== undefined)
    @IsString() @IsNotEmpty() @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ enum: ['single', 'multi'], example: 'single' })
    @ValidateIf(o => o.selection_type !== undefined)
    @IsIn(['single','multi'])
    selection_type?: 'single' | 'multi';

    @ApiPropertyOptional({ example: true })
    @ValidateIf(o => o.is_required !== undefined)
    @IsBoolean()
    is_required?: boolean;
}