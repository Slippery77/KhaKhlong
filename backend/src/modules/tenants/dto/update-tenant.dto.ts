import { IsString, IsOptional, ValidateIf , Matches, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateTenantDTO{
        @ValidateIf((o)=> o.restaurant_name !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(150)
        restaurant_name?:string
        
        @ValidateIf((o)=> o.phone !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(20)
        phone?:string
    
        @ValidateIf((o)=> o.house_number !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(10)
        house_number?:string
    
        @IsString()
        @IsOptional()
        @MaxLength(255)
        moo?:string
    
        @IsString()
        @IsOptional()
        @MaxLength(255)
        soi?:string
    
        @IsString()
        @IsOptional()
        @MaxLength(255)
        road?:string
    
        @ValidateIf((o)=> o.subdistrict !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(100)
        subdistrict?:string
        
        @ValidateIf((o)=> o.district !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(100)
        district?:string

        @ValidateIf((o)=> o.province !== undefined)
        @IsString()
        @IsNotEmpty()
        @MaxLength(100)
        province?:string
    
        @ValidateIf((o)=> o.postal_code !== undefined)
        @IsString()
        @IsNotEmpty()
        @Matches(/^\d{5}$/)
        @MaxLength(10)
        postal_code?:string

        @IsOptional() 
        @Matches(/^\d{13}$/, { message: 'tax_id ต้องเป็นตัวเลข 13 หลัก' })
        tax_id?: string | null;

        @IsOptional()
        @Matches(/^0\d{9}$/,{message:'เบอร์พร้อมเพย์ต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'})
        promptpay_id?:string|null
}