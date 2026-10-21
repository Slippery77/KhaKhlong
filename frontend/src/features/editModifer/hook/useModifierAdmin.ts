import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import type { ModifierGroup, ModifierGroupInput, ModifierItem } from '../types/modifier.types';

type ApiResponse<T> = { data: T };
type AdminMenuResponse = { modifier_groups: ModifierGroup[] };

export function useModifierAdmin() {
  const { accessToken } = useAuth();
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ApiResponse<AdminMenuResponse>>('/menu/admin', accessToken);
      setGroups(response.data.modifier_groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลตัวเลือกเสริมไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  const run = async <T,>(request: () => Promise<T>): Promise<T | null> => {
    setError(null);
    setIsSubmitting(true);
    try {
      return await request();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createGroup = async (input: ModifierGroupInput) => run(async () => {
    const response = await apiFetch<ApiResponse<ModifierGroup>>('/menu/modifier-groups', accessToken, 'POST', input);
    await load(true);
    return response.data;
  });

  const updateGroup = async (groupId: string, input: ModifierGroupInput) => run(async () => {
    await apiFetch(`/menu/modifier-groups/${groupId}`, accessToken, 'PATCH', input);
    await load(true);
  });

  const setGroupActive = async (groupId: string, active: boolean) => run(async () => {
    await apiFetch(`/menu/modifier-groups/${groupId}/${active ? 'enable' : 'disable'}`, accessToken, 'PATCH');
    await load(true);
  });

  const createModifier = async (groupId: string, name: string, priceDelta: number) => run(async () => {
    const response = await apiFetch<ApiResponse<ModifierItem>>('/menu/modifiers', accessToken, 'POST', {
      modifier_group_id: groupId,
      name,
      price_delta: priceDelta,
    });
    await load(true);
    return response.data;
  });

  const updateModifier = async (modifierId: string, name: string, priceDelta: number) => run(async () => {
    await apiFetch(`/menu/modifiers/${modifierId}`, accessToken, 'PATCH', { name, price_delta: priceDelta });
    await load(true);
  });

  const setModifierActive = async (modifierId: string, active: boolean) => run(async () => {
    await apiFetch(`/menu/modifiers/${modifierId}/${active ? 'enable' : 'disable'}`, accessToken, 'PATCH');
    await load(true);
  });

  return {
    groups, isLoading, isSubmitting, error, reload: () => load(true),
    createGroup, updateGroup, setGroupActive, createModifier, updateModifier, setModifierActive,
  };
}
