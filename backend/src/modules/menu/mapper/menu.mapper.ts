
export interface CategoryResponse {
    category_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export function toCategoryResponse(row: any): CategoryResponse {
    return {
        category_id: row.category_id,
        name: row.name,
        sort_order: row.sort_order,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export interface MenuItemResponse {
    menu_item_id: string;
    category_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    is_available: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export function toMenuItemResponse(row: any): MenuItemResponse {
    return {
        menu_item_id: row.menu_item_id,
        category_id: row.category_id,
        name: row.name,
        description: row.description,
        image_url: row.image_url ?? null,
        price: Number(row.price),   // ← DECIMAL(10,2) มาเป็น string ต้องแปลง
        is_available: row.is_available,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export interface ModifierGroupResponse{
    modifier_group_id : string;
    name:string;
    selection_type:string;
    is_required:boolean;
    is_active:boolean;
    created_at:Date;
    updated_at:Date;
}

export function toModifierGroupResponse(row:any):ModifierGroupResponse{
    return{
        modifier_group_id:row.modifier_group_id,
        name:row.name,
        selection_type:row.selection_type,
        is_required:row.is_required,
        is_active:row.is_active,
        created_at:row.created_at,
        updated_at:row.updated_at,

    }
}

export interface ItemModifierResponse{
    modifier_id:string;
    modifier_group_id:string;
    name:string;
    price_delta:number;
    is_active:boolean;
    created_at:Date;
    updated_at:Date;
}

export function toItemModifierResponse(row:any):ItemModifierResponse{
    return{
        modifier_id:row.modifier_id,
        modifier_group_id:row.modifier_group_id,
        name:row.name,
        price_delta:Number(row.price_delta),
        is_active:row.is_active,
        created_at:row.created_at,
        updated_at:row.updated_at,
    }
}

export interface MenuItemModifierGroupResponse{
    modifier_group_id: string;
    name: string;
    selection_type: string;
    is_required: boolean;
    sort_order: number;
}

export function toMenuItemModifierGroupResponse(row:any):MenuItemModifierGroupResponse{
    return {
        modifier_group_id: row.modifier_group_id,
        name: row.name,
        selection_type: row.selection_type,
        is_required: row.is_required,
        sort_order: row.sort_order,
    }
}
