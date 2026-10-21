import { IsOptional, IsString, MaxLength } from "class-validator";

export class LogoutDTO{
    @IsOptional()
    @IsString()
    @MaxLength(100)
    refreshToken?:string;
}