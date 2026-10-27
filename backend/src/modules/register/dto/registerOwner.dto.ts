import { IsString, IsNotEmpty, IsEmail, IsOptional, MaxLength, Matches} from 'class-validator';

export class RegisterOwnerDto {
    @IsString()
    @IsNotEmpty()
    restaurant_name!:string

    @IsString()
    @IsNotEmpty()
    tenant_slug!:string

    @IsString()
    @IsNotEmpty()
    phone!:string

    @IsString()
    @IsNotEmpty()
    house_number!:string

    @IsString()
    @IsOptional()
    moo!:string

    @IsString()
    @IsOptional()
    soi!:string

    @IsString()
    @IsOptional()
    road!:string

    @IsString()
    @IsNotEmpty()
    subdistrict!:string

    @IsString()
    @IsNotEmpty()
    district!:string

    @IsString()
    @IsNotEmpty()
    province!:string

    @IsString()
    @IsNotEmpty()
    postal_code!:string

    @IsEmail()
    @IsNotEmpty()
    email! : string;

    @IsString()
    @IsNotEmpty()
    username! :string;

    @IsString()
    @IsNotEmpty()
    password! : string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    display_name!:string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{6}$/, { message: 'PIN ต้องเป็นตัวเลข 6 หลัก' })
    pin!:string;
}