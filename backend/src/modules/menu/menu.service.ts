import { Injectable , ConflictException, NotFoundException, BadRequestException} from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { CategoryDTO } from './dto/category.dto';
import { toCategoryResponse, toItemModifierResponse, toMenuItemModifierGroupResponse, toMenuItemResponse, toModifierGroupResponse} from './mapper/menu.mapper';
import { MenuItemDTO } from './dto/menu.dto';
import { UpdateMenuItemDTO } from './dto/update_menuItem.dto';
import { ModifierGroupDTO } from './dto/modifier-group.dto';
import { ItemModifierDTO } from './dto/modifier_items.dto';
import { ReplaceMenuItemModifierGroupsDTO } from './dto/replaceMenuItemModifierGroups.dto';
import { SetAvailabilityMenuDTO } from './dto/setAvailabilityMenu.dto';
import { UpdateModifierGroupDTO } from './dto/update_modifier_group.dto';
import { UpdateModifierItemDTO } from './dto/update_modifierItem.dto';

@Injectable()
export class MenuService {
    constructor(
        private readonly menuRepository:MenuRepository,
    ){}

    async createCategory(dto: CategoryDTO){  
        try{
            const result = await this.menuRepository.createCategory(dto.name)
        return {
            status:"success",
            data: toCategoryResponse(result)
        };
        }catch(err:any){
            if(err.code === '23505'){
                throw new ConflictException(`มีหมวดหมู่ชื่อ "${dto.name}" ที่ใช้งานอยู่แล้ว`);
            }
            throw err;
        }
    }

    async setCategoryActive(categoryId:string,is_active:boolean){
        let result;
        try {
            result = await this.menuRepository.setCategoryActive(categoryId, is_active);
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException('มีหมวดหมู่ชื่อเดียวกันที่ใช้งานอยู่ ให้เปลี่ยนชื่อหมวดใดหมวดหนึ่งก่อนเปิด');
            }
            throw err;
        }
        if (!result) throw new NotFoundException('ไม่พบหมวดหมู่นี้');

        return { status: 'success', data: toCategoryResponse(result) };
    }

    async renameCategory(categoryId:string, dto:CategoryDTO){
        let result;
        try{
            result = await this.menuRepository.renameCategory(categoryId, dto.name);
        }catch(err:any){
            if(err.code === '23505'){
                throw new ConflictException(`มีหมวดหมู่ชื่อ "${dto.name}" ที่ใช้งานอยู่แล้ว`);
            }
            throw err;
        }
        if(!result){
            throw new NotFoundException('ไม่พบหมวดหมู่ที่ระบุ')
        }
        return{
            status:'success',
            data:toCategoryResponse(result)
        };

    }

    async listCategories(){
        const result = await this.menuRepository.listCategories();
        return {
            status:'success',
            data:result.map(toCategoryResponse)
        }
    }
    // ส่วนของ Menu
    // สร้างเมนูใหม่
    async createMenu(dto:MenuItemDTO){
            try {
            const result = await this.menuRepository.createMenuItem(
                dto.category_id,
                dto.name,
                dto.description ?? null,
                dto.price,
                dto.image_url ?? null,
            );
            return { status: 'success', data: toMenuItemResponse(result) };
            } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException(`มีเมนูชื่อ "${dto.name}" ที่ขายอยู่แล้ว`);
            }
            if (err.code === '23503') {
                // composite FK (tenant_id, category_id) ปฏิเสธ
                // ทั้งกรณีหมวดหมู่ไม่มีจริง และกรณีเป็นของร้านอื่น
                throw new BadRequestException('ไม่พบหมวดหมู่นี้');
            }
            throw err;
        }
    }

    async setMenuItemActive(menuItemId:string,is_active:boolean){
        let result;
        try {
            result = await this.menuRepository.setMenuItemsActive(menuItemId, is_active);
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException('มีเมนูชื่อเดียวกันที่ขายอยู่ ให้เปลี่ยนชื่อเมนูใดเมนูหนึ่งก่อนเปิดขาย');
            }
            throw err;
        }
        if (!result) throw new NotFoundException('ไม่พบเมนูนี้');
        return { status: 'success', data: toMenuItemResponse(result) };
    }

    async updateMenuItem(menuItemId:string, dto:UpdateMenuItemDTO){
       const fields = Object.keys(dto).filter(
            (k) => dto[k as keyof UpdateMenuItemDTO] !== undefined 
        );
        if(fields.length===0){
            throw new BadRequestException('ข้อมูลที่ส่งมาว่าง');
        }
        let result;
        try{
            result = await this.menuRepository.updateMenuItem(menuItemId,dto,fields)
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException(`มีเมนูชื่อ "${dto.name}" ที่ขายอยู่แล้ว`);
            }
            if (err.code === '23503') {
                // composite FK (tenant_id, category_id) ปฏิเสธ
                // ทั้งกรณีหมวดหมู่ไม่มีจริง และกรณีเป็นของร้านอื่น
                throw new BadRequestException('ไม่พบหมวดหมู่นี้');
            }
            throw err;
        }
        if(!result){
            throw new NotFoundException('ไม่พบเมนูนี้')
        }
        return {
            status:'success',
            data:toMenuItemResponse(result)
        }
    }

    //ส่วน Item Modifier 
    async createModifierGroup(dto:ModifierGroupDTO){
        try{
            const result = await this.menuRepository.createModifierGroup(dto.name,dto.selection_type,dto.is_required??false);
            return {
                status:'success',
                data:toModifierGroupResponse(result)
            }
        }catch(err:any){
            if (err.code ==='23505'){
                throw new ConflictException(`มีกลุ่มตัวเลือกชื่อ "${dto.name}" อยู่แล้ว`);
            }
            throw err;
        }
    }

    async updateModifierGroup(groupId: string, dto: UpdateModifierGroupDTO) {
        const fields = Object.keys(dto).filter(k => dto[k as keyof UpdateModifierGroupDTO] !== undefined);
        if (fields.length === 0) throw new BadRequestException('ข้อมูลที่ส่งมาว่าง');

        let result;
        try {
            result = await this.menuRepository.updateModifierGroup(groupId, dto, fields);
        } catch (err: any) {
            if (err.code === '23505') throw new ConflictException(`มีกลุ่มตัวเลือกชื่อ "${dto.name}" อยู่แล้ว`);
            throw err;
        }
        if (!result) throw new NotFoundException('ไม่พบกลุ่มตัวเลือกนี้');

        return { status: 'success', data: toModifierGroupResponse(result) };
    }

    async setModifierGroupActive(groupId: string, isActive: boolean) {
    let result;
        try {
            result = await this.menuRepository.setModifierGroupActive(groupId, isActive);
        } catch (err: any) {
            if (err.code === '23505') throw new ConflictException('มีกลุ่มตัวเลือกชื่อเดียวกันที่เปิดใช้อยู่ ให้เปลี่ยนชื่อกลุ่มใดกลุ่มหนึ่งก่อนเปิด');  // เกิดได้เฉพาะตอน enable
            throw err;
        }
        if (!result){
            throw new NotFoundException ('ไม่พบกลุ่มตัวเลือกนี้')
        }
        return {
            status:'success',
            data:toModifierGroupResponse(result)
        };
    }

    async createModifierItem(dto:ItemModifierDTO){
        try{
            const result = await this.menuRepository.createModifierItem(dto.modifier_group_id,dto.name,dto.price_delta)
            return {
                status:'success',
                data:toItemModifierResponse(result)
            }
        }catch(err:any){
            if(err.code === '23505'){
                throw new ConflictException(`มีตัวเลือกชื่อ "${dto.name}" ในกลุ่มนี้แล้ว`);
            }
            if (err.code === '23503') {
                throw new BadRequestException('ไม่พบกลุ่มตัวเลือกนี้');
            }
            throw err;
        }
    }

    async updateItemModifier(modifier_id:string,dto:UpdateModifierItemDTO){
        const fields = Object.keys(dto).filter(k => dto[k as keyof UpdateModifierItemDTO] !== undefined);
        if(fields.length===0){
            throw new BadRequestException('ข้อมูลที่ส่งมาว่าง');
        }
        let result;
        try{
            result = await this.menuRepository.updateItemModifier(modifier_id,dto,fields);
        }catch (err: any) {
            if (err.code === '23505') throw new ConflictException(`มีตัวเลือกชื่อ "${dto.name}" ในกลุ่มนี้อยู่แล้ว`);
            throw err;
        }
        if (!result) throw new NotFoundException('ไม่พบตัวเลือกนี้');
        return{
            status:'success',
            data:toItemModifierResponse(result)
        };
    }
    
    async setItemModifierActive(modifierId:string,is_active:boolean){
        let result;
        try{
            result = await this.menuRepository.setItemModifierActive(modifierId,is_active);
        }catch(err:any){
            if(err.code==='23505'){
                throw new ConflictException('มีตัวเลือกชื่อเดียวกันที่เปิดใช้อยู่ ให้เปลี่ยนชื่อตัวใดตัวหนึ่งก่อนเปิด');
            }
            throw err;
        }
        if (!result){
            throw new NotFoundException ('ไม่พบตัวเลือกนี้')
        }
        return{
            status:'success',
            data:toItemModifierResponse(result)
        }
    }

    async replaceMenuItemModifierGroups(menuItemId:string,dto:ReplaceMenuItemModifierGroupsDTO){
        const item = await this.menuRepository.touchMenuItem(menuItemId);
        if(!item){
            throw new NotFoundException('ไม่พบเมนูนี้')
        }
        try{
            await this.menuRepository.deleteMenuItemModifierGroups(menuItemId);
            await this.menuRepository.insertMenuItemModifierGroups(menuItemId,dto.modifier_group_ids);
        }catch(err:any){
            if (err.code === '23503'){
                throw new BadRequestException('ไม่พบกลุ่มตัวเลือกบางรายการ')
            }
            throw err
        }
        const result = await this.menuRepository.listMenuItemModifierGroups(menuItemId)
        return {
            status:'success',
            data:result.map(toMenuItemModifierGroupResponse)
        }
    }

    async setMenuItemAvailability(menuItemId:string, dto:SetAvailabilityMenuDTO){
        const result = await this.menuRepository.setMenuItemAvailability(menuItemId,dto.is_available);
        if(!result){
            throw new NotFoundException('ไม่พบเมนูนี้');
        }
        return{
            status:'success',
            data:toMenuItemResponse(result)
        };
    }

    // ประกอบหมวด → เมนู → กลุ่มตัวเลือก ใช้ร่วมกันทั้ง /full และ /admin
    private async buildMenu(includeInactive: boolean) {
        const categories     = await this.menuRepository.listCategoriesForMenu(includeInactive);
        const menuItems      = await this.menuRepository.listMenuItemsForMenu(includeInactive);
        const modifierGroups = await this.menuRepository.listModifierGroupsForMenu(includeInactive);
        const modifiers      = await this.menuRepository.listModifiersForMenu(includeInactive);
        const links          = await this.menuRepository.listItemGroupLinksForMenu(includeInactive);

        const groupIdsByItem = new Map<string, string[]>();
        for (const l of links) {
            const list = groupIdsByItem.get(l.menu_item_id) ?? [];
            list.push(l.modifier_group_id);
            groupIdsByItem.set(l.menu_item_id, list);
        }

        const itemsByCategory = new Map<string, any[]>();
        for (const i of menuItems) {
            const list = itemsByCategory.get(i.category_id) ?? [];
            list.push({ ...toMenuItemResponse(i), modifier_group_ids: groupIdsByItem.get(i.menu_item_id) ?? [] });
            itemsByCategory.set(i.category_id, list);
        }

        const modifiersByGroup = new Map<string, any[]>();
        for (const m of modifiers) {
            const list = modifiersByGroup.get(m.modifier_group_id) ?? [];
            list.push(toItemModifierResponse(m));
            modifiersByGroup.set(m.modifier_group_id, list);
        }

        return {
            categories: categories.map(c => ({
                ...toCategoryResponse(c),
                items: itemsByCategory.get(c.category_id) ?? [],
            })),
            modifier_groups: modifierGroups.map(g => ({
                ...toModifierGroupResponse(g),
                modifiers: modifiersByGroup.get(g.modifier_group_id) ?? [],
            })),
        };
    }

    async getFullMenu(){
        const version = await this.menuRepository.getMenuVersion();
        const menu = await this.buildMenu(false);
        return {status:'success',
            data:{
                version, 
                ...menu
            }
        } 
    }

    async getAdminMenu(){
        const menu = await this.buildMenu(true);
        return {
            status:'success',
            data:menu
        }
    }
}
