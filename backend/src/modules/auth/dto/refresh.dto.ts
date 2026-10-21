import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RefreshDTO{
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    refreshToken!:string;
}