import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../libs/appClient";
import { useAuth } from "../../auth/context/AuthContext";
import type { Category } from "../types/menu.types";

export function useAdminMenu(){
    const {accessToken} = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState<string|null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const load = useCallback(async (silent = false) => {
        if(!silent)
            setIsLoading(true);
        setError(null);
        try{
            const res = await apiFetch<{data: {categories:Category[]}}>('/menu/admin',accessToken);
            setCategories(res.data.categories)
        }catch(err){
            setError(err instanceof Error ? err.message : 'โหลดเมนูไม่สำเร็จ');
        }finally{
            setIsLoading(false);
        }
    },[accessToken]);

    useEffect(() => {load();},[load]);

    return {categories,isLoading, error, reload:()=>load(true)};
    //reload คือปุ่มโหลดใหม่ refresh ถ้าโหลดใหม่จะเอาข้อมูลมาแสดง
}

export function useCreateCategory(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const createCategory = async (name:string)=>{
        setError(null);
        setIsSubmitting(true);
        try{
            const res = await apiFetch<{data: {category_id:string}}>('/menu/category',accessToken,'POST',{name});
            return res.data;
        }catch(err){
            setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        };
    }
    return{
        createCategory,
        isSubmitting,
        error
    };
}

export function useMenuItemStatus(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const setAvailability = async (menuItemId: string, isAvailable: boolean): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try{
            await apiFetch(`/menu/items/${menuItemId}/availability`,accessToken,'PATCH',{is_available: isAvailable})
            return true;
        }catch(err){
            setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
        return false;
    };

    const disable = async (menuItemId: string): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try{
            await apiFetch(`/menu/items/${menuItemId}/disable`,accessToken,'PATCH')
            return true
        }catch(err){
            setError(err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }

        return false;
    };

    const enable = async (menuItemId: string): Promise<boolean> => {
        // TODO
        setError(null);
        setIsSubmitting(true);
        try{
            await apiFetch(`/menu/items/${menuItemId}/enable`,accessToken,'PATCH')
            return true
        }catch(err){
            setError(err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
        return false;
    };

    return { setAvailability, disable, enable, isSubmitting, error };
}


export function useEditCategory(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const editCategoryName = async (category_id:string, name:string)=>{
        setError(null);
        setIsSubmitting(true);
        if(name.length > 100){
            setError('ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร');
            setIsSubmitting(false);
            return false;
        };
        try{
            await apiFetch(`/menu/category/${category_id}`,accessToken,'PATCH',{name});
            return true;
        }catch(err){
            setError(err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
        return false;
    };

    const disable = async (category_id:string) =>{
        setError(null);
        setIsSubmitting(true);

        try{
            await apiFetch(`/menu/category/${category_id}/disable`,accessToken,'PATCH')
            return true;
        }catch(err){
            setError( err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
        return false;
    }

    const enable = async (category_id:string) =>{
        setError(null);
        setIsSubmitting(true);

        try{
            await apiFetch(`/menu/category/${category_id}/enable`,accessToken,'PATCH')
            return true;
        }catch(err){
            setError( err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
        return false;
    }
    return {editCategoryName,disable,enable,isSubmitting,error};
}

export function useCreateMenu(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createMenuItem = async ( category_id:string,name:string, description:string|null, price:number) =>{
        setError(null)
        setIsSubmitting(true)
        try{
            const res = await apiFetch<{data:{menu_item_id:string}}>('/menu/items',accessToken,'POST',{category_id,name,description,price});
            return res.data.menu_item_id;
        }catch(err){
            setError(err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
    }
    return { createMenuItem ,isSubmitting ,error}
}

// ใช้กับปุ่มดินสอ (ข้อ 3 ทำทีหลัง)
export function useEditMenu(){
    // แก้ข้อมูลเมนู
    // PATCH /menu/items/:menu_item_id
    // body: ส่งเฉพาะช่องที่แก้ (ทุกช่องไม่บังคับ แต่ห้ามส่ง {} ว่าง → 400)
    //   name?: string
    //   description?: string | null   ← null = ล้างคำอธิบาย
    //   price?: number
    //   category_id?: string          ← ย้ายหมวด
    // 409 = ชื่อซ้ำ
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const editMenuItem = async ( menu_item_id:string,name?:string, description?:string|null, price?:number,category_id?:string)=>{
        const body = { category_id,name,description,price };
        
        // อันนี้เช็คค่าใน body ว้ามีข้อมูลมูลไหม ถ้ามีข้อมูลจะส่งเป็น false ส่วนถ้าไม่มีข้อมูลเล่ย (undefined) ทั้งหมด จะส่ง true เข้าส่วน if
        if(Object.values(body).every(v=> v === undefined)){
            setError('ไม่มีข้อมูลที่เปลี่ยน');
            return false;
        }
        
        setError(null);
        setIsSubmitting(true);

        try {
            await apiFetch(`/menu/items/${menu_item_id}`,accessToken,'PATCH',body);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message:"บันทึกไม่สำเร็จ")
        }finally{
            setIsSubmitting(false);
        }
        return false;
    }
    

    // ผูกกลุ่มตัวเลือกกับเมนู (ถ้าในฟอร์มให้เลือกด้วย)
    // PUT /menu/items/:menu_item_id/modifier-groups
    // body: { modifier_group_ids: string[] }   ← เรียงตามลำดับที่แสดง, [] = ถอดทั้งหมด, สูงสุด 20

    return { editMenuItem, isSubmitting, error};
}