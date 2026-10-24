import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AnyAuthenticated, RequirePermissions } from '../auth/guards/permissions.decorator';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorActionResponseDto, FloorDto, FloorResponseDto } from './dto/floor-response.dto';

@ApiBearerAuth()
@ApiTags('Floors')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('floors')
export class FloorsController {
    constructor(private readonly floorsService: FloorsService) {}

    /**
     * GET /floors
     * ทุก role อ่านได้ (เหมือน GET /tables) — หน้าตั้งค่าโต๊ะเปิดให้พนักงานดูผังได้
     */
    @ApiOperation({
        summary: 'ดึงรายการชั้นทั้งหมดของร้าน',
        description:
            'ดึงรายชั้นพร้อมจำนวนโต๊ะที่ "ตั้งไว้" (table_count) และจำนวนโต๊ะที่มีจริง (actual_table_count) เรียงตามเลขชั้น',
    })
    @ApiOkResponse({ description: 'ดึงรายการชั้นสำเร็จ', type: [FloorDto] })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์เข้าถึง' })
    @AnyAuthenticated()
    @Get()
    async list() {
        return this.floorsService.listFloors();
    }

    /**
     * POST /floors
     * Permission ที่ต้องใช้: table:manage
     */
    @ApiOperation({
        summary: 'เพิ่มชั้นใหม่',
        description:
            'เพิ่มชั้นพร้อมระบุจำนวนโต๊ะที่ตั้งไว้ (เป้าหมาย ระบบไม่สร้างโต๊ะให้อัตโนมัติ) และชื่อชั้นได้ ต้องมีสิทธิ์ table:manage และเลขชั้นต้องไม่ซ้ำในร้าน',
    })
    @ApiCreatedResponse({ description: 'เพิ่มชั้นสำเร็จ', type: FloorResponseDto })
    @ApiBadRequestResponse({ description: 'ข้อมูลไม่ถูกต้อง เช่น เลขชั้นน้อยกว่า 1' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ table:manage ในการเพิ่มชั้น' })
    @ApiConflictResponse({ description: 'เลขชั้นซ้ำกับที่มีอยู่แล้วในร้าน' })
    @RequirePermissions('table:manage')
    @Post()
    async create(@Body() dto: CreateFloorDto) {
        return this.floorsService.create(dto);
    }

    /**
     * PATCH /floors/:id
     * Permission ที่ต้องใช้: table:manage
     */
    @ApiOperation({
        summary: 'แก้ไขข้อมูลชั้น',
        description:
            'แก้ไขเลขชั้น ชื่อชั้น หรือจำนวนโต๊ะที่ตั้งไว้ ส่งเฉพาะช่องที่เปลี่ยน โต๊ะผูกกับชั้นด้วย floor_id จึงไม่ต้องกังวลเรื่องย้ายโต๊ะตาม',
    })
    @ApiParam({ name: 'id', description: 'รหัสชั้น (UUID)', format: 'uuid', example: 'c1000000-0000-0000-0000-000000000001' })
    @ApiOkResponse({ description: 'แก้ไขชั้นสำเร็จ', type: FloorResponseDto })
    @ApiBadRequestResponse({ description: 'ไม่มีข้อมูลที่เปลี่ยน หรือรูปแบบ UUID ไม่ถูกต้อง' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ table:manage ในการแก้ไขชั้น' })
    @ApiNotFoundResponse({ description: 'ไม่พบชั้นที่ต้องแก้ไข' })
    @ApiConflictResponse({ description: 'เลขชั้นใหม่ซ้ำกับชั้นอื่นในร้าน' })
    @RequirePermissions('table:manage')
    @Patch(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFloorDto) {
        return this.floorsService.update(id, dto);
    }

    /**
     * DELETE /floors/:id
     * Permission ที่ต้องใช้: table:manage
     */
    @ApiOperation({
        summary: 'ลบชั้น',
        description:
            'ลบชั้นที่ยังไม่มีโต๊ะอยู่ ถ้าชั้นนั้นมีโต๊ะอยู่ต้องย้ายหรือจัดการโต๊ะให้หมดก่อน (กันข้อมูลโต๊ะกำพร้า)',
    })
    @ApiParam({ name: 'id', description: 'รหัสชั้น (UUID)', format: 'uuid', example: 'c1000000-0000-0000-0000-000000000001' })
    @ApiOkResponse({ description: 'ลบชั้นสำเร็จ', type: FloorActionResponseDto })
    @ApiBadRequestResponse({ description: 'รูปแบบ UUID ไม่ถูกต้อง' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ table:manage ในการลบชั้น' })
    @ApiNotFoundResponse({ description: 'ไม่พบชั้นที่ต้องลบ' })
    @ApiConflictResponse({ description: 'ชั้นนี้ยังมีโต๊ะอยู่ ลบไม่ได้' })
    @RequirePermissions('table:manage')
    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.floorsService.remove(id);
    }
}
