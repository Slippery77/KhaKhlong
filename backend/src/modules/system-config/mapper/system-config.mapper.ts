type ValueType = 'int' | 'decimal' | 'bool' | 'text';

export interface ConfigRow {
  config_key: string;
  value: string;
  value_type: ValueType;
  min_value: string | null;
  max_value: string | null;
  allowed_values: string[] | null;
  owner_only: boolean;
  description: string | null;
  updated_at: Date | null;
}

function parseValue(raw: string, type: ValueType): string | number | boolean {
  switch (type) {
    case 'bool':    return raw === 'true';
    case 'int':
    case 'decimal': return Number(raw);
    default:        return raw;
  }
}

const toNumberOrNull = (v: string | null) => (v === null ? null : Number(v));

export function toConfigResponse(row: ConfigRow) {
  return {
    key:           row.config_key,
    value:         parseValue(row.value, row.value_type),
    valueType:     row.value_type,
    min:           toNumberOrNull(row.min_value),
    max:           toNumberOrNull(row.max_value),
    allowedValues: row.allowed_values,
    ownerOnly:     row.owner_only,
    description:   row.description,
    updatedAt:     row.updated_at,
  };
}