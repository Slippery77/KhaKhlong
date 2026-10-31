import { Body, Controller , Post, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './guards/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AnyAuthenticated } from './guards/permissions.decorator';
import { RefreshDTO } from './dto/refresh.dto';
import { LogoutDTO } from './dto/logout.dto';

// Controller สำหรับจัดการ endpoint ที่เกี่ยวกับการยืนยันตัวตนของผู้ใช้
@Controller('auth')
export class AuthController {
    // Inject AuthService เพื่อให้ controller สามารถเรียกใช้ logic การ login ได้
    constructor(private readonly authService: AuthService) {}

    // กำหนดให้ response ของ endpoint นี้คืนสถานะ HTTP 200 เมื่อ login สำเร็จ

    @ApiOperation({ summary: 'เข้าสู่ระบบ' })
    @ApiOkResponse({ description: 'เข้าสู่ระบบสำเร็จ' })
    @ApiUnauthorizedResponse({ description: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' })
    @ApiTooManyRequestsResponse({ description: 'บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผ่านผิดเกินกำหนด' })
    @HttpCode(HttpStatus.OK)
    // Route สำหรับการเข้าสู่ระบบที่อยู่ที่ /auth/login
    // จำกัด 20 ครั้ง/นาที ต่อ IP เพื่อกัน flood โดยไม่บังการล็อกรายบัญชีที่ครั้งที่ 5
    @Throttle({default:{ttl:60000, limit:20}})
    @Public()
    @Post('login')
    async login(@Body() dto: LoginDto, @Req() req?: any) {
        const clientIp = req?.ip ?? 'unknown';
        const deviceInfo = req?.headers?.['user-agent'] ?? 'unknown';
        // รับข้อมูล login จาก client แล้วส่งต่อไปยัง AuthService เพื่อทำการตรวจสอบ
        return this.authService.signIn(dto, clientIp, deviceInfo);
    }
    
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'ออกจากระบบ' })
    @ApiOkResponse({ description: 'ออกจากระบบแล้ว' })
    @ApiUnauthorizedResponse({ description: 'token ไม่ถูกต้องหรือหมดอายุ' })
    @AnyAuthenticated()
    @Post('logout')
    async logout(@Body() dto:LogoutDTO) {
        return this.authService.logout(dto.refreshToken);
    }

    @ApiOperation({
        summary:"ขอ access token ใหม่ด้วย refresh token"
    })
    @ApiOkResponse({ description: 'ได้ access token และ refresh token ใบใหม่' })
    @ApiUnauthorizedResponse({ description: 'refresh token ไม่ถูกต้อง หมดอายุ หรือถูกเพิกถอน' })
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() dto:RefreshDTO, @Req() req?: any){
        const clientIp = req?.ip ?? 'unknown';
        const deviceInfo = req?.headers?.['user-agent'] ?? 'unknown';
        return this.authService.refresh(dto.refreshToken, clientIp, deviceInfo);
    }
}
