export interface StoreOperationsConfig {
  businessDayStartHour: number;
  shiftEscalationHours: number;
  inventoryVarianceAlertPercent: number;
}

export interface ConfigItem {
  key: string;
  value: string | number | boolean;
  valueType: 'int' | 'decimal' | 'bool' | 'text';
  min: number | null;
  max: number | null;
  allowedValues: string[] | null;
  ownerOnly: boolean;
  description: string | null;
  updatedAt: string | null;
}

export interface ConfigListResponse {
  status: string;
  data: ConfigItem[];
}

