export interface RegisterOwner{
    username : string;
    email : string;
    password : string;
    confirmPassword : string;
    /** ชื่อแสดง (display_name ใน backend) — เว้นว่างหน้าบ้านได้ ระบบจะใช้ username แทน */
    display_name?: string;
} 

export interface RegisterRestaurant{
    restaurant_name : string;
    tenant_slug : string;
    phone : string;
    house_number : string;
    moo : string;
    soi : string;
    road : string;
    subdistrict : string;
    district : string; 
    province : string;
    postal_code : string;
}

export type registerRequest = RegisterRestaurant & Omit<RegisterOwner, "confirmPassword">;