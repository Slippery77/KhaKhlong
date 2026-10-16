import {IsIn, IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class ModifierGroupDTO{
    @ApiProperty({ description: 'ชื่อกลุ่ม', example: 'ระดับความเผ็ด', maxLength: 100 })
    @IsString()
    @MaxLength(100)
    @IsNotEmpty()
    name!:string

    @ApiProperty({ description: 'เลือกได้ตัวเดียวหรือหลายตัว', enum: ['single', 'multi'], example: 'single' })
    @IsIn(['single','multi'])
    selection_type!:'single'|'multi';

    @ApiPropertyOptional({ description: 'บังคับให้ลูกค้าเลือกหรือไม่ ค่าเริ่มต้น false', example: true })
    @IsOptional()
    @IsBoolean()
    is_required?:boolean
}