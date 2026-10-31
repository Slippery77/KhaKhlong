export interface Category{
    category_id:string;
    name:string;
    sort_order:number;
    is_active:boolean;
    items:MenuItem[];
}

export interface MenuItem{
    menu_item_id: string;
    category_id: string;
    name: string;
    description: string | null;
    image_url?: string | null;
    price: number; 
    is_available: boolean;
    is_active: boolean;
    modifier_group_ids: string[];   // UUID ของ modifier_groups ที่ผูกกับเมนูนี้
}

// รูปแบบ modifier_groups ที่ GET /menu/full คืนมา
export interface ApiModifier {
    modifier_id: string;
    modifier_group_id: string;
    name: string;
    price_delta: number;
}

export interface ApiModifierGroup {
    modifier_group_id: string;
    name: string;
    selection_type: 'single' | 'multi';
    is_required: boolean;
    modifiers: ApiModifier[];
}

// รูปแบบ top-level data ของ GET /menu/full
export interface FullMenuData {
    version: string | null;
    categories: Category[];
    modifier_groups: ApiModifierGroup[];
}
