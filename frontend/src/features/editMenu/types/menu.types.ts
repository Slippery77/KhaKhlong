
export interface MenuItem{
    menu_item_id: string;
    category_id: string;
    name: string;
    description:string | null;
    price:number; 
    is_available: boolean;
    is_active: boolean;
     modifier_group_ids:string[];
}

export interface Category{
    category_id:string;
    name:string;
    sort_order:number;
    is_active:boolean;
    items:MenuItem[];
}