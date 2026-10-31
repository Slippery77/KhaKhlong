import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../libs/appClient";
import { useAuth } from "../../auth/context/AuthContext";
import type { Category } from "../types/menu.types";
import type { ModifierGroup } from "../../editModifer/types/modifier.types";

export function useAdminMenu(){
    const {accessToken} = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [modifier, setModifier] = useState<ModifierGroup[]>([]);
    const [error, setError] = useState<string|null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const load = useCallback(async (silent = false) => {
        if(!silent)
            setIsLoading(true);
        setError(null);
        try{
            const res = await apiFetch<{data: {categories:Category[], modifier_groups:ModifierGroup[]}}>('/menu/admin',accessToken);
            setCategories(res.data.categories);
            setModifier(res.data.modifier_groups);
        }catch(err){
            setError(err instanceof Error ? err.message : 'โหลดเมนูไม่สำเร็จ');
        }finally{
            setIsLoading(false);
        }
    },[accessToken]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load();
        }, 0);
        return () => window.clearTimeout(timer);
    },[load]);

    return {categories,modifier,isLoading, error, reload:()=>load(true)};
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

    const createMenuItem = async (
        category_id: string,
        name: string,
        description: string | null,
        price: number,
        image_url?: string | null,
    ) => {
        setError(null);
        setIsSubmitting(true);
        try{
            const res = await apiFetch<{data:{menu_item_id:string}}>(
                '/menu/items',
                accessToken,
                'POST',
                { category_id, name, description, price, image_url: image_url ?? null },
            );
            return res.data.menu_item_id;
        }catch(err){
            setError(err instanceof Error ? err.message:'บันทึกไม่สำเร็จ');
        }finally{
            setIsSubmitting(false);
        }
    }
    return { createMenuItem ,isSubmitting ,error}
}

export function useEditMenu(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const editMenuItem = async (
        menu_item_id: string,
        name?: string,
        description?: string | null,
        price?: number,
        category_id?: string,
        image_url?: string | null,
    ) => {
        const body = { category_id, name, description, price, image_url };
        
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

    return { editMenuItem, isSubmitting, error};
}

export function useLinkModifier(){
    const {accessToken} = useAuth();
    const [error, setError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const link = async (menu_item_id:string,modifier_group_ids:string[]) => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch(`/menu/items/${menu_item_id}/modifier-groups`,accessToken,'PUT',{modifier_group_ids})
            return true;
        } catch (error) {
            setError(error instanceof Error ? error.message:'บันทึกไม่สำเร็จ')
        }
        finally{
            setIsSubmitting(false);
        }
        return false;
    }
    return {link,error,isSubmitting}
}

export const uselinkModifier = useLinkModifier;
