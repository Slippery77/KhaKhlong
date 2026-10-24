import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CancleAttempt{
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    reason!:string
}