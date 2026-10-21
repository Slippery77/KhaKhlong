export type SelectionType = 'single' | 'multi';

export interface ModifierItem {
  modifier_id: string;
  modifier_group_id: string;
  name: string;
  price_delta: number;
  is_active: boolean;
}

export interface ModifierGroup {
  modifier_group_id: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  is_active: boolean;
  modifiers: ModifierItem[];
}

export interface ModifierGroupInput {
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
}
