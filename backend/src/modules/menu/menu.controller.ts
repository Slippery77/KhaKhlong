import { Controller, Body, Param, Post, Patch, ParseUUIDPipe, Get, Put } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CategoryDTO } from './dto/category.dto';
import { AnyAuthenticated, RequirePermissions } from '../auth/guards/permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiConflictResponse, ApiCreatedResponse, ApiBadRequestResponse,ApiForbiddenResponse,ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MenuItemDTO } from './dto/menu.dto';
import { UpdateMenuItemDTO } from './dto/update_menuItem.dto';
import { ModifierGroupDTO } from './dto/modifier-group.dto';
import { ItemModifierDTO } from './dto/modifier_items.dto';
import { ReplaceMenuItemModifierGroupsDTO } from './dto/replaceMenuItemModifierGroups.dto';
import { SetAvailabilityMenuDTO } from './dto/setAvailabilityMenu.dto';
import { UpdateModifierGroupDTO } from './dto/update_modifier_group.dto'; 
import { UpdateModifierItemDTO } from './dto/update_modifierItem.dto';

@ApiBearerAuth()
@ApiTags('Menu')
@ApiResponse({status:401 ,description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('menu')
export class MenuController {
    constructor(private readonly menuService : MenuService){}
    
    @ApiOperation({
        summary: 'สร้างหมวดหมู่เมนู',
        description: 'สร้างหมวดหมู่เมนูใหม่ โดยต้องมีสิทธิ์ menu:edit และต้องชื่อไม่ซ้ำกับหมวดหมู่ที่มีอยู่แล้ว'
    })
    @ApiResponse({status:201, description:'หมวดหมู่ถูกสร้างเรียบร้อย'})
    @ApiResponse({status:400, description: 'ข้อมูลไม่ถูกต้อง' })
    @ApiResponse({status:403, description:'ไม่มีสิทธิ์ในการสร้าง menu'})
    @ApiResponse({status:409, description:'มีหมวดหมู่ชื่อนี้ที่ใช้งานอยู่แล้ว'})
    @RequirePermissions('menu:edit')
    @Post('category')
    async createCategory(@Body() dto: CategoryDTO, ){
        return this.menuService.createCategory(dto);
    }

    @ApiOperation({
        summary: 'ปิดการใช้งานหมวดหมู่เมนู',
        description: 'ปิดการใช้งานหมวดหมู่เมนูที่ระบุ โดยผู้ใช้งานต้องมีสิทธิ์ menu:edit และหมวดหมู่จะไม่สามารถใช้งานได้จนกว่าจะเปิดใช้งานอีกครั้ง'
    })
    @ApiResponse({status:200, description:'ปิดการใช้งานหมวดหมู่เรียบร้อยแล้ว'})
    @ApiResponse({status:400, description:'ข้อมูลไม่ถูกต้อง' })
    @ApiResponse({status:403, description:'ไม่มีสิทธิ์ในการแก้ไขหมวดหมู่เมนู'})
    @ApiResponse({status:404, description:'ไม่พบหมวดหมู่เมนูที่ระบุ'})
    @RequirePermissions('menu:edit')
    @Patch('category/:category_id/disable')
    async disableCategory(@Param('category_id', ParseUUIDPipe) categoryId:string){
        return this.menuService.setCategoryActive(categoryId,false);
    }

    @ApiOperation({
        summary: 'เปิดการใช้งานหมวดหมู่เมนู',
        description: 'เปิดการใช้งานหมวดหมู่เมนูที่ระบุ โดยผู้ใช้งานต้องมีสิทธิ์ menu:edit '
    })
    @ApiResponse({status:200, description:'เปิดใช้งานหมวดหมู่เรียบร้อยแล้ว'})
    @ApiResponse({status:400, description:'ข้อมูลไม่ถูกต้อง' })
    @ApiResponse({status:403, description:'ไม่มีสิทธิ์ในการแก้ไขหมวดหมู่เมนู'})
    @ApiResponse({status:404, description:'ไม่พบหมวดหมู่เมนูที่ระบุ'})
    @ApiResponse({status:409, description:'มีหมวดหมู่อื่นชื่อเดียวกันเปิดใช้อยู่ ต้องเปลี่ยนชื่อก่อน'})
    @RequirePermissions('menu:edit')
    @Patch('category/:category_id/enable')
    async enableCategory(@Param('category_id', ParseUUIDPipe) categoryId:string){
        return this.menuService.setCategoryActive(categoryId,true);
    }

    @ApiOperation({
        summary:'เปลี่ยนชื่อหมวดหมู่',
        description:'เปลี่ยนชื่อหมวดหมู่',
    })
    @ApiResponse({status: 200,description: 'เปลี่ยนชื่อหมวดหมู่เรียบร้อยแล้ว'})
    @ApiResponse({status: 400,description: 'ข้อมูลไม่ถูกต้อง'})
    @ApiResponse({status: 403,description: 'ไม่มีสิทธิ์ในการแก้ไขหมวดหมู่เมนู'})
    @ApiResponse({status: 404,description: 'ไม่พบหมวดหมู่เมนูที่ระบุ'})
    @ApiResponse({status: 409,description: 'มีหมวดหมู่ชื่อนี้ที่ใช้งานอยู่แล้ว'})
    @RequirePermissions('menu:edit')
    @Patch('category/:category_id')
    async renameCategory(@Param('category_id',ParseUUIDPipe) categoryId:string, @Body() dto:CategoryDTO){
        return this.menuService.renameCategory(categoryId, dto);
    }

    @ApiOperation({ summary: 'ดึงหมวดหมู่เมนูทั้งหมด' })
    @ApiOkResponse({ description: 'ดึงข้อมูลเรียบร้อยแล้ว' })
    @AnyAuthenticated()
    @Get('category')                                    // ← เดิม @Get() ได้ GET /menu
    async listCategories() {
        return this.menuService.listCategories();
    }

    //ส่วนเมนู
    @ApiOperation({ summary: 'สร้างเมนูใหม่ในหมวดหมู่ที่ระบุ' })
    @ApiCreatedResponse({ description: 'สร้างเมนูเรียบร้อยแล้ว' })
    @ApiBadRequestResponse({ description: 'ข้อมูลไม่ถูกต้อง หรือไม่พบหมวดหมู่ที่ระบุ' })
    @ApiConflictResponse({ description: 'มีเมนูชื่อนี้ขายอยู่แล้ว' })
    @RequirePermissions('menu:edit')
    @Post('items')
    async createMenuItems(@Body() dto:MenuItemDTO){
        return this.menuService.createMenu(dto);
    }

    @ApiOperation({ summary: 'กลับมาขายเมนูอีกครั้ง' })
    @ApiOkResponse({ description: 'เปิดขายเมนูเรียบร้อยแล้ว' })
    @ApiNotFoundResponse({ description: 'ไม่พบเมนูที่ระบุ' })
    @ApiConflictResponse({ description: 'มีเมนูอื่นชื่อเดียวกันขายอยู่ ต้องเปลี่ยนชื่อก่อน' })
    @RequirePermissions('menu:edit')
    @Patch('items/:menu_item_id/enable')
    async enableMenuItem(@Param('menu_item_id', ParseUUIDPipe) menuItemId: string) {
        return this.menuService.setMenuItemActive(menuItemId, true);
    }

    @ApiOperation({ summary: 'ปิดการขายเมนู' })
    @ApiOkResponse({ description: 'ปิดขายเมนูเรียบร้อยแล้ว' })
    @ApiNotFoundResponse({ description: 'ไม่พบเมนูที่ระบุ' })
    @RequirePermissions('menu:edit')
    @Patch('items/:menu_item_id/disable')
    async disableMenuItem(@Param('menu_item_id', ParseUUIDPipe) menuItemId: string) {
        return this.menuService.setMenuItemActive(menuItemId, false);
    }

     @ApiOperation({
        summary: 'แก้ไขเมนู',
        description: 'ส่งเฉพาะช่องที่ต้องการแก้ (name, description, price, category_id) ช่องที่ไม่ส่งจะไม่ถูกแตะ',
    })
    @ApiParam({ name: 'menu_item_id', format: 'uuid', example: 'b7e2d4f1-3c8a-4e5b-9f1d-2a6c8e0b4d7f' })
    @ApiOkResponse({ description: 'แก้ไขเมนูเรียบร้อยแล้ว' })
    @ApiBadRequestResponse({ description: 'ไม่ได้ส่งข้อมูล ข้อมูลผิดรูป หรือไม่พบหมวดหมู่ที่ระบุ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบเมนูที่ระบุ' })
    @ApiConflictResponse({ description: 'มีเมนูชื่อนี้ขายอยู่แล้ว' })
    @RequirePermissions('menu:edit')
    @Patch('items/:menu_item_id')
    async updateItem(@Param('menu_item_id', ParseUUIDPipe) menuItemId:string,@Body() dto:UpdateMenuItemDTO ){
        return this.menuService.updateMenuItem(menuItemId,dto)
    }

    @ApiOperation({
        summary: 'สร้างกลุ่มตัวเลือก',
        description: 'เช่น ระดับความเผ็ด หรือ ของเพิ่ม · single เลือกได้ตัวเดียว multi เลือกได้หลายตัว · สร้างแล้วนำไปผูกกับหลายเมนูได้',
    })
    @ApiCreatedResponse({ description: 'สร้างกลุ่มตัวเลือกเรียบร้อยแล้ว' })
    @ApiBadRequestResponse({ description: 'ข้อมูลไม่ถูกต้อง เช่น selection_type ไม่ใช่ single หรือ multi' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiConflictResponse({ description: 'มีกลุ่มตัวเลือกชื่อนี้อยู่แล้ว' })
    @RequirePermissions('menu:edit')
    @Post('modifier-groups')
    async createModifierGroup(@Body() dto:ModifierGroupDTO){
        return this.menuService.createModifierGroup(dto);
    }

    @ApiOperation({ summary: 'แก้ไขกลุ่มตัวเลือก', description: 'ส่งเฉพาะ field ที่ต้องการแก้ ชื่อห้ามซ้ำกับกลุ่มอื่นที่เปิดใช้อยู่ (ไม่สนตัวพิมพ์เล็กใหญ่)' })
    @ApiParam({ name: 'modifier_group_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'body ว่าง, selection_type ไม่ใช่ single/multi หรือส่ง null' })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบกลุ่ม หรือเป็นของร้านอื่น' })
    @ApiConflictResponse({ description: 'มีกลุ่มชื่อนี้ที่เปิดใช้อยู่แล้ว' })
    @RequirePermissions('menu:edit')
    @Patch('modifier-groups/:modifier_group_id')
    async updateModifierGroup(@Param('modifier_group_id', ParseUUIDPipe) groupId: string,@Body() dto: UpdateModifierGroupDTO) {
        return this.menuService.updateModifierGroup(groupId,dto) 
    }

    @ApiOperation({
    summary: 'ปิดการใช้งานกลุ่มตัวเลือก',
    description: 'เมนูที่ผูกกลุ่มนี้ไว้จะไม่เห็นกลุ่มนี้ใน /menu/full แต่การผูกยังอยู่ เปิดกลับแล้วจะกลับมาเหมือนเดิมโดยไม่ต้องผูกใหม่',
    })
    @ApiParam({ name: 'modifier_group_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'id ไม่ใช่ uuid' })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบกลุ่ม หรือเป็นของร้านอื่น' })
    @RequirePermissions('menu:edit')
    @Patch('modifier-groups/:modifier_group_id/disable')
    async disableModifierGroup(@Param('modifier_group_id', ParseUUIDPipe) groupId:string) {
        return this.menuService.setModifierGroupActive(groupId, false);
    }

    @ApiOperation({
    summary: 'เปิดการใช้งานกลุ่มตัวเลือก',
    description: 'เมนูที่เคยผูกกลุ่มนี้ไว้จะเห็นกลุ่มนี้ใน /menu/full อีกครั้งโดยไม่ต้องผูกใหม่ ถ้ามีกลุ่มอื่นชื่อเดียวกันเปิดอยู่จะได้ 409',
    })
    @ApiParam({ name: 'modifier_group_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'id ไม่ใช่ uuid' })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiConflictResponse({ description: 'มีกลุ่มอื่นชื่อเดียวกันเปิดใช้อยู่ ต้องเปลี่ยนชื่อกลุ่มใดกลุ่มหนึ่งก่อน' })
    @ApiNotFoundResponse({ description: 'ไม่พบกลุ่ม หรือเป็นของร้านอื่น' })
    @RequirePermissions('menu:edit')
    @Patch('modifier-groups/:modifier_group_id/enable')
    async enableModifierGroup(@Param('modifier_group_id', ParseUUIDPipe) groupId:string) {
         return this.menuService.setModifierGroupActive(groupId, true);
    }

    @ApiOperation({
        summary: 'สร้างตัวเลือกในกลุ่ม',
        description: 'เช่น เผ็ดน้อย หรือ ไข่ดาว +10 บาท · price_delta เป็น 0 ได้สำหรับตัวเลือกที่ไม่คิดเงิน',
    })
    @ApiCreatedResponse({ description: 'สร้างตัวเลือกเรียบร้อยแล้ว' })
    @ApiBadRequestResponse({ description: 'ข้อมูลไม่ถูกต้อง หรือไม่พบกลุ่มตัวเลือกที่ระบุ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiConflictResponse({ description: 'มีตัวเลือกชื่อนี้ในกลุ่มแล้ว' })
    @RequirePermissions('menu:edit')
    @Post('modifiers')
    async createModifierItem(@Body() dto:ItemModifierDTO){
        return this.menuService.createModifierItem(dto);
    }

    @ApiOperation({
        summary: 'แก้ไขตัวเลือก',
        description: 'ส่งเฉพาะ field ที่ต้องการแก้ (name, price_delta) · ย้ายกลุ่มไม่ได้ · แก้ตัวเลือกที่ปิดอยู่ได้ · บิลเก่าไม่เปลี่ยนเพราะเก็บ snapshot ไว้แล้ว',
    })
    @ApiParam({ name: 'modifier_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'body ว่าง, ชนิดข้อมูลผิด, price_delta ติดลบ หรือส่ง field ที่ไม่อนุญาต เช่น modifier_group_id' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบตัวเลือก หรือเป็นของร้านอื่น' })
    @ApiConflictResponse({ description: 'มีตัวเลือกชื่อนี้ที่เปิดใช้อยู่แล้ว' })
    @RequirePermissions('menu:edit')
    @Patch('modifiers/:modifier_id')
    async updateModifierItem(@Param('modifier_id',ParseUUIDPipe) modifierId:string,@Body() dto:UpdateModifierItemDTO){
        return this.menuService.updateItemModifier(modifierId,dto);
    }

    @ApiOperation({summary: 'เปิดการใช้งานตัวเลือก',description: 'ถ้ากลุ่มของตัวเลือกนี้ปิดอยู่ ตัวเลือกจะยังไม่ขึ้นใน /menu/full จนกว่าจะเปิดกลุ่ม',})
    @ApiParam({ name: 'modifier_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบตัวเลือก หรือเป็นของร้านอื่น' })
    @ApiConflictResponse({ description: 'มีตัวเลือกอื่นชื่อเดียวกันเปิดใช้อยู่ ต้องเปลี่ยนชื่อก่อน' })
    @RequirePermissions('menu:edit')
    @Patch('modifiers/:modifier_id/enable')
    async enableModifierItem(@Param('modifier_id',ParseUUIDPipe) modifierId:string){
        return this.menuService.setItemModifierActive(modifierId,true);
    }

    @ApiOperation({ summary: 'ปิดการใช้งานตัวเลือก', description: 'ตัวเลือกจะหายจาก /menu/full แต่ยังเห็นใน /menu/admin' })
    @ApiParam({ name: 'modifier_id', format: 'uuid' })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบตัวเลือก หรือเป็นของร้านอื่น' })
    @RequirePermissions('menu:edit')
    @Patch('modifiers/:modifier_id/disable')
    async disableModifierItem(@Param('modifier_id',ParseUUIDPipe) modifierId:string){
        return this.menuService.setItemModifierActive(modifierId,false);
    }

    @ApiOperation({
    summary: 'กำหนดกลุ่มตัวเลือกของเมนู',
    description: 'ส่งรายการกลุ่มทั้งชุด ลำดับใน array คือลำดับที่แสดง · ส่ง [] เพื่อถอดออกทั้งหมด',
    })
    @ApiParam({ name: 'menu_item_id', format: 'uuid', example: 'b7e2d4f1-3c8a-4e5b-9f1d-2a6c8e0b4d7f' })
    @ApiOkResponse({ description: 'บันทึกเรียบร้อย คืนกลุ่มที่ผูกอยู่ตามลำดับ' })
    @ApiBadRequestResponse({ description: 'ข้อมูลไม่ถูกต้อง id ซ้ำ หรือไม่พบกลุ่มตัวเลือกบางรายการ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบเมนู หรือเมนูถูกปิดขายแล้ว' })
    @RequirePermissions('menu:edit')
    @Put('items/:menu_item_id/modifier-groups')
    async replaceMenuItemModifierGroups(@Param('menu_item_id', ParseUUIDPipe) menuItemId:string , @Body() dto:ReplaceMenuItemModifierGroupsDTO){
        return this.menuService.replaceMenuItemModifierGroups(menuItemId,dto);
    }


    @ApiOperation({
        summary: 'ตั้งสถานะเมนูหมดวันนี้ / กลับมาขายได้',
        description: [
            'ใช้เมื่อวัตถุดิบหมดระหว่างวัน (MENU-03) ต่างจาก disable ที่เป็นการเลิกขายถาวร',
            '',
            '- เมนูที่ `is_available = false` ยังแสดงในหน้า POS แต่ฐานข้อมูลปฏิเสธการสั่ง (MENU-05)',
            '- ไม่ reset อัตโนมัติเมื่อขึ้นวันใหม่ ต้องกดเปิดกลับเอง',
            '- เมนูที่เลิกขายแล้ว (is_active = false) แก้ไม่ได้ ได้ 404',
        ].join('\n'),
    })
    @ApiParam({ name: 'menu_item_id', format: 'uuid', example: 'b4e2d9f1-7c3a-4d8e-9b1f-2a6c8e4d0f71' })
    @ApiOkResponse({
        description: 'สำเร็จ คืนข้อมูลเมนูหลังแก้',
        schema: {
            example: {
                status: 'success',
                data: {
                    menu_item_id: 'b4e2d9f1-7c3a-4d8e-9b1f-2a6c8e4d0f71',
                    category_id: 'a3f1c8e2-4b7d-4e91-8c2a-1f5e9d3b7a60',
                    name: 'ผัดกะเพราหมู',
                    description: null,
                    price: 60,
                    is_available: false,
                    is_active: true,
                    created_at: '2026-10-01T03:00:00.000Z',
                    updated_at: '2026-10-09T12:30:00.000Z',
                },
            },
        },
    })
    @ApiBadRequestResponse({ description: 'menu_item_id ไม่ใช่ uuid หรือ is_available ไม่ใช่ boolean / ไม่ได้ส่งมา' })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token หรือ token หมดอายุ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @ApiNotFoundResponse({ description: 'ไม่พบเมนู เลิกขายไปแล้ว หรือเป็นของร้านอื่น' })
    @RequirePermissions('menu:edit')
    // TODO: MENU-03 ให้พนักงานครัวกดหมดเองได้ — เปลี่ยนเป็น 'menu:toggle_availability'
    // ต้องเพิ่ม permission ใน seed และ user-roles-permissions.md ก่อน
    @Patch('items/:menu_item_id/availability')
    async setMenuItemAvailability(@Param('menu_item_id',ParseUUIDPipe) menuItemId:string , @Body() dto:SetAvailabilityMenuDTO){
        return this.menuService.setMenuItemAvailability(menuItemId,dto);
    }

    @ApiOperation({
        summary: 'ดึงเมนูทั้งร้านในก้อนเดียว สำหรับ offline cache',
        description: [
            'คืนหมวดหมู่ เมนู กลุ่มตัวเลือก และตัวเลือก ที่ยังเปิดใช้งาน (is_active) ทั้งหมด',
            '',
            '- เมนูที่หมดวันนี้ (is_available = false) **ยังถูกส่งมา** ให้หน้า POS แสดงเป็นสีเทา',
            '- เมนูในหมวดที่ถูกปิด ไม่ถูกส่งมา',
            '- กลุ่มตัวเลือกแยกไว้ที่ `modifier_groups` เมนูอ้างด้วย `modifier_group_ids` (เรียงตามลำดับแสดงผล)',
            '- `version` = updated_at ล่าสุดของเมนูทั้งร้าน ถ้าไม่ตรงกับที่ cache ไว้ให้โหลดใหม่',
            '- ร้านที่ยังไม่มีเมนู ได้ array ว่าง และ `version: null`',
        ].join('\n'),
    })
    @ApiOkResponse({
        description: 'สำเร็จ',
        schema: {
            example: {
                status: 'success',
                data: {
                    version: '2026-10-08T01:00:00.000Z',
                    categories: [
                        {
                            category_id: 'a3f1c8e2-4b7d-4e91-8c2a-1f5e9d3b7a60',
                            name: 'จานเดียว',
                            sort_order: 0,
                            items: [
                                {
                                    menu_item_id: 'b4e2d9f1-7c3a-4d8e-9b1f-2a6c8e4d0f71',
                                    category_id: 'a3f1c8e2-4b7d-4e91-8c2a-1f5e9d3b7a60',
                                    name: 'ผัดกะเพราหมู',
                                    description: 'ไข่ดาวแยก',
                                    price: 60,
                                    is_available: true,
                                    modifier_group_ids: ['c5d3e0a2-8d4b-4e9f-a02c-3b7d9f5e1a82'],
                                },
                            ],
                        },
                    ],
                    modifier_groups: [
                        {
                            modifier_group_id: 'c5d3e0a2-8d4b-4e9f-a02c-3b7d9f5e1a82',
                            name: 'ระดับความเผ็ด',
                            selection_type: 'single',
                            is_required: true,
                            modifiers: [
                                {
                                    modifier_id: 'd6e4f1b3-9e5c-4fa0-b13d-4c8e0a6f2b93',
                                    modifier_group_id: 'c5d3e0a2-8d4b-4e9f-a02c-3b7d9f5e1a82',
                                    name: 'เผ็ดน้อย',
                                    price_delta: 0,
                                },
                            ],
                        },
                    ],
                },
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token หรือ token หมดอายุ' })
    @AnyAuthenticated()
    @Get('full')
    async getFullMenu(){
        return this.menuService.getFullMenu();
    }

    @ApiOperation({
        summary: 'ดึงเมนูทั้งร้านสำหรับหน้าจัดการเมนู',
        description: [
            'โครงเหมือน /menu/full แต่รวมของที่ปิดไปแล้วด้วย',
            '',
            '- ทุกแถวมี `is_active` ใช้ทำสีเทาและเลือกปุ่ม enable/disable',
            '- เมนูในหมวดที่ปิดยังถูกส่งมา อยู่ใต้หมวดนั้น',
            '- `modifier_group_ids` รวมกลุ่มที่ปิดด้วย',
            '- ไม่มี `version` เพราะหน้านี้ไม่ได้ cache',
        ].join('\n'),
    })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiUnauthorizedResponse({ description: 'ไม่มี token หรือ token หมดอายุ' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ menu:edit' })
    @RequirePermissions('menu:edit')
    @Get('admin')
    async adminMenu(){
        return this.menuService.getAdminMenu();
    }
}
