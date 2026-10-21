import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDTO } from './dto/createUser.dto';
import { RolesService } from '../roles/roles.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly rolesService: RolesService
    ) {}

    async findUsernameAndTenantID(tenantID: string, username: string) {
        return this.usersRepository.findUsernameAndTenantID(tenantID, username);
    }

    async createOwner(
        tenant_id: string,
        role_id: string,
        username: string,
        email: string,
        password: string,
        display_name: string
    ) {
        return this.usersRepository.createOwner(
            tenant_id,
            role_id,
            username,
            email,
            password,
            display_name
        );
    }

    async findEmail(email: string) {
        return this.usersRepository.findEmail(email);
    }

    async findActiveById(userId:string){
         return await this.usersRepository.findActiveById(userId)
    }

    async createUser(tenantID: string, dto: CreateUserDTO) {
        try {
            const isUsernameExisted = await this.usersRepository.findUsernameAndTenantID(tenantID, dto.username);

            if (isUsernameExisted) {
                throw new ConflictException('Username already existed!');
            }

            const role = await this.rolesService.findRoleName(dto.role_name);
            if (!role) {
                throw new BadRequestException('Invalid role');
            }
            const roleID = role.role_id;

            const hash_password = await bcrypt.hash(dto.password, 10);
            const pin_hash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;
            const result = await this.usersRepository.createUser(tenantID, roleID, dto.username, hash_password, pin_hash, dto.display_name);
            return {
                message: 'Create user Successfully!',
                user_id: result.users_id,
                username: result.username,
                display_name: result.display_name,
                role: dto.role_name,
            };
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException('Username already existed!');
            }
            throw err;
        }
    }
}
