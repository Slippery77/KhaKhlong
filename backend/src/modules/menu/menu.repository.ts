import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { UpdateMenuItemDTO } from './dto/update_menuItem.dto';
import { UpdateModifierGroupDTO } from './dto/update_modifier_group.dto';
import { UpdateModifierItemDTO } from './dto/update_modifierItem.dto';

const CATEGORY_COLS = `category_id, name, sort_order, is_active, created_at, updated_at`;
const MENU_ITEM_COLS = `menu_item_id, category_id, name, description, price, is_available, is_active, created_at, updated_at`;
const MODIFIER_GROUP_COLS = `modifier_group_id, name, selection_type, is_required,is_active,created_at,updated_at`;
const MODIFIER_COLS = `modifier_id, modifier_group_id, name, price_delta, is_active, created_at, updated_at`;
const UPDATABLE = ['name', 'price', 'description', 'category_id'];
const MODIFIER_GROUP_UPDATABLE = ['name', 'selection_type', 'is_required'] as const;
const MODIFIER_ITEM_UPDATABLE = ['name','price_delta'] as const ;

@Injectable()
export class MenuRepository{
    constructor( private readonly db: DbContextService){}
    
    async createCategory(name:string){
        const sql = `
            INSERT INTO categories(tenant_id, name, sort_order)
            VALUES(
                app_tenant_id(),
                $1,
                COALESCE((SELECT MAX(sort_order)+1 FROM categories), 0)
            )
            RETURNING ${CATEGORY_COLS};
        `;
        const result = await this.db.query(sql,[name]);
        return result.rows[0];
    }

    async setCategoryActive(category_id:string,is_active:boolean){
        const sql = `
            UPDATE categories
            SET is_active = $2, updated_at=now()
            WHERE category_id = $1
            RETURNING ${CATEGORY_COLS};
        `;
        const result = await this.db.query(sql,[category_id,is_active]);
        return result.rows[0]??null;
    }

    async renameCategory(category_id:string,name:string){
        const sql =`
            UPDATE categories
            SET name= $2, updated_at = now()
            WHERE category_id = $1
            RETURNING ${CATEGORY_COLS}
        `;
        const result = await this.db.query(sql,[category_id,name]);
        return result.rows[0]??null;  
    }
    
    async listCategories(){
        const sql = `
            SELECT ${CATEGORY_COLS}
            FROM categories 
            ORDER BY sort_order,name
        `;
        const result = await this.db.query(sql);
        return result.rows;
    }
    // ส่วนเมนู
    async createMenuItem(categoryId:string,name:string,description:string|null,price:number){
        const sql = `
            INSERT INTO menu_items(tenant_id, category_id, name, description, price)
            VALUES (app_tenant_id(),$1,$2,$3,$4)
            RETURNING ${MENU_ITEM_COLS};
        `;
        const result = await this.db.query(sql,[categoryId,name,description,price]);
        return result.rows[0];
    }
    async setMenuItemsActive(menu_id:string, isActive:boolean){
        const sql = `
            UPDATE menu_items
            SET is_active = $2, updated_at=now()
            WHERE menu_item_id =$1
            RETURNING ${MENU_ITEM_COLS};
        `;
        const result = await this.db.query(sql,[menu_id,isActive]);
        return result.rows[0]??null;
    }
    
    async updateMenuItem(menu_id:string,dto:UpdateMenuItemDTO,fields:string[]){
        const params: unknown[] = [menu_id];
        const sets:string[] = [];
        
        //ใช้ for...of เพื่อดึงค่า "ชื่อฟิลด์" ออกมาจริงๆ 
        for(const f of fields){
            // ตรวจสอบว่าเป็นฟิลด์ที่อนุญาตให้อัปเดตได้หรือไม่
            if(!UPDATABLE.includes(f)){
                continue;
            }
            // 3. ใช้ keyof เพื่อดึงค่าจาก dto มาเก็บไว้ใน params ค่าไปทาง params เสมอ ชื่อคอลัมน์ผ่าน UPDATABLE แล้ว
            // เก็บชื่อ field เช่น price = 60 ใน params จะเป็น [menu_id,price]
            params.push(dto[f as keyof UpdateMenuItemDTO]);
            //ตัวแรกคือ menu_id ดังนั้นตัวถัดไปใน loop จะเริ่มที่ index ของ params ล่าสุดพอดี
            sets.push(`${f} = $${params.length}`);
        }
        const sql = `
        UPDATE menu_items
        SET ${sets.join(', ')}, updated_at = now()
        WHERE menu_item_id = $1
        RETURNING ${MENU_ITEM_COLS}
        `
        const result = await this.db.query(sql,params);
        return result.rows[0]??null;
    }

    //ส่วนกลุ่มตัวเลือก
    async createModifierGroup(name:string,selectionType:string,isRequired:boolean){
        const sql = `
            INSERT INTO modifier_groups(tenant_id,name,selection_type,is_required)
            VALUES (app_tenant_id(), $1,$2,$3)
            RETURNING ${MODIFIER_GROUP_COLS}
        `
        const result = await this.db.query(sql,[name,selectionType,isRequired])
        return result.rows[0]
    }

    async updateModifierGroup(groupId: string, dto: UpdateModifierGroupDTO, fields: string[]) {
        const sets: string[] = [];
        const params: any[] = [groupId];

        for (const f of fields) {
            if (!MODIFIER_GROUP_UPDATABLE.includes(f as any)) continue;  // whitelist กัน SQL injection ผ่านชื่อคอลัมน์
            params.push(dto[f as keyof UpdateModifierGroupDTO]);
            sets.push(`${f} = $${params.length}`);
        }
        sets.push('updated_at = now()');

        const sql = `
            UPDATE modifier_groups
            SET ${sets.join(', ')}
            WHERE modifier_group_id = $1
            RETURNING ${MODIFIER_GROUP_COLS}
        `;
        const result = await this.db.query(sql, params);
        return result.rows[0] ?? null;
    }

    async setModifierGroupActive(groupId: string, isActive: boolean) {
        const sql = `
            UPDATE modifier_groups
            SET is_active = $2, updated_at = now()
            WHERE modifier_group_id = $1
            RETURNING ${MODIFIER_GROUP_COLS}
        `;
        const result = await this.db.query(sql,[groupId,isActive]);
        return result.rows[0]??null;
    }   

    // ส่วนตัวเลือก
    async createModifierItem(modifierGroupId:string,name:string,priceDelta:number){
        const sql = `
            INSERT INTO modifiers(tenant_id,modifier_group_id,name,price_delta)
            VALUES (app_tenant_id(), $1,$2,$3)
            RETURNING ${MODIFIER_COLS}
        `
        const result = await this.db.query(sql,[modifierGroupId,name,priceDelta])
        return result.rows[0]
    }

    async setMenuItemAvailability(menuItemId: string, isAvailable: boolean){
        const sql =`
            UPDATE menu_items
            SET is_available = $2, updated_at = now()
            WHERE menu_item_id = $1 AND is_active
            RETURNING ${MENU_ITEM_COLS}
        `;
        const result = await this.db.query(sql,[menuItemId,isAvailable]);
        return result.rows[0]??null;
    }
    
    async setItemModifierActive(modifierId:string,is_active:boolean){
        const sql =`
            UPDATE modifiers
            SET is_active = $2, updated_at = now()
            WHERE modifier_id = $1
            RETURNING ${MODIFIER_COLS}
        `;
        const result = await this.db.query(sql,[modifierId,is_active]);
        return result.rows[0] ?? null;
    }

    async updateItemModifier(modifierId:string, dto:UpdateModifierItemDTO , fields:string[]){
        const sets: string[] = [];
        const params: any[] = [modifierId];

        for (const f of fields) {
            if (!MODIFIER_ITEM_UPDATABLE.includes(f as any)) continue;  // whitelist กัน SQL injection ผ่านชื่อคอลัมน์
            params.push(dto[f as keyof UpdateModifierItemDTO]);
            sets.push(`${f} = $${params.length}`);
        }
        sets.push('updated_at = now()');

        const sql = `
            UPDATE modifiers
            SET ${sets.join(', ')}
            WHERE modifier_id = $1
            RETURNING ${MODIFIER_COLS}
        `;
        const result =await this.db.query(sql,params);
        return result.rows[0]??null;
    }

    //จัดการผูกข้อมูล modifier และ modifier_group
    async touchMenuItem(menuItemId:string){
        const sql = `
            UPDATE menu_items
            SET updated_at = now()
            where menu_item_id = $1 AND is_active
            RETURNING  menu_item_id;     
        `;
        const result = await this.db.query(sql,[menuItemId]);
        return result.rows[0]??null;
    }

    async deleteMenuItemModifierGroups(menuItemId:string){
        const sql = `
            DELETE FROM menu_item_modifier_groups
            where menu_item_id = $1
        `
        await this.db.query(sql,[menuItemId]);
    }

    async insertMenuItemModifierGroups(menuItemId:string,modifierGroupId:string[]){
        if(modifierGroupId.length===0){
            return;
        }         
        const sql = `
            INSERT INTO menu_item_modifier_groups(tenant_id, menu_item_id , modifier_group_id,sort_order)
            SELECT app_tenant_id(), $1, g.id, g.ord-1 
            FROM unnest($2::uuid[]) WITH ORDINALITY AS g(id, ord);
        `;
        await this.db.query(sql,[menuItemId,modifierGroupId]);
    }
    
    async listMenuItemModifierGroups(menuItemId:string){
        const sql = `
            SELECT g.modifier_group_id, g.name, g.selection_type, g.is_required, m.sort_order
            FROM menu_item_modifier_groups m
            JOIN modifier_groups g on g.modifier_group_id = m.modifier_group_id
            WHERE m.menu_item_id = $1 AND g.is_active
            ORDER BY m.sort_order
        `;
        const result = await this.db.query(sql,[menuItemId]);
        return result.rows;
    } 
    
    //ส่วนดึงข้อมูล
    //เอาไว้ดึงข้อมูลใน endpoint get /full และ /admin
    async listCategoriesForMenu(includeInactive: boolean) {
        const where = includeInactive ? '' : 'WHERE is_active';
        const sql = `
            SELECT category_id, name, sort_order, is_active, updated_at
            FROM categories
            ${where}
            ORDER BY sort_order, name
        `;
        return (await this.db.query(sql)).rows;
    }

    async listMenuItemsForMenu(includeInactive: boolean) {
        const where = includeInactive ? '' : 'WHERE m.is_active AND c.is_active';
        const sql = `
            SELECT m.category_id, m.menu_item_id, m.name, m.description, m.price,
                m.is_available, m.is_active, m.updated_at
            FROM menu_items m
            JOIN categories c ON c.category_id = m.category_id
            ${where}
            ORDER BY m.name
        `;
        return (await this.db.query(sql)).rows;
    }

    async listModifierGroupsForMenu(includeInactive: boolean) {
        const where = includeInactive ? '' : 'WHERE is_active';
        const sql = `
            SELECT modifier_group_id, name, selection_type, is_required, is_active, updated_at
            FROM modifier_groups
            ${where}
            ORDER BY name
        `;
        return (await this.db.query(sql)).rows;
    }

    async listModifiersForMenu(includeInactive: boolean) {
        const where = includeInactive ? '' : 'WHERE m.is_active AND g.is_active';
        const sql = `
            SELECT m.modifier_id, m.modifier_group_id, m.name, m.price_delta, m.is_active, m.updated_at
            FROM modifiers m
            JOIN modifier_groups g ON g.modifier_group_id = m.modifier_group_id
            ${where}
            ORDER BY m.name
        `;
        return (await this.db.query(sql)).rows;
    }

    async listItemGroupLinksForMenu(includeInactive: boolean) {
        // เงื่อนไขอยู่ใน JOIN ON จึงใช้ AND ไม่ใช่ WHERE
        const activeOnly = includeInactive ? '' : 'AND g.is_active';
        const sql = `
            SELECT l.modifier_group_id, l.menu_item_id
            FROM menu_item_modifier_groups l
            JOIN modifier_groups g ON g.modifier_group_id = l.modifier_group_id ${activeOnly}
            ORDER BY l.menu_item_id, l.sort_order
        `;
        return (await this.db.query(sql)).rows;
    }

    async getMenuVersion(){
        const sql = `
            SELECT GREATEST(
                (SELECT max(updated_at) FROM categories),
                (SELECT max(updated_at) FROM menu_items),
                (SELECT max(updated_at) FROM modifier_groups),
                (SELECT max(updated_at) FROM modifiers)
            ) AS version
        `;
        return (await this.db.query(sql)).rows[0].version;
    }
}