import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
    sub: string;
    username: string;
    tenantID: string;
    role: string;
    token_version?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor( 
        private readonly jwtService : JwtService,
        private readonly reflector : Reflector,
    ){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[
            context.getHandler(),
            context.getClass(),
        ])
        if (isPublic){
            return true;
        }
        
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token){
            throw new UnauthorizedException('No token provided!');
        }

        let payload: JwtPayload;
        try{
            payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        }catch{
            throw new UnauthorizedException('Invalid token');
        }

        // token ที่ออกก่อนมีระบบ token_version จะไม่มี claim นี้ → ถือว่าใช้ไม่ได้
        // (ต้อง login ใหม่) ส่วนการเทียบค่ากับ DB ทำใน TenantContextInterceptor
        // เพราะตรงนั้นเพิ่งจะมี tenant context ให้ query users ได้
        if (payload.token_version === undefined) {
            throw new UnauthorizedException('Invalid token');
        }

        request['user'] = payload;
        return true;
    }
    
    private extractTokenFromHeader(request: Request): string | undefined{
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
