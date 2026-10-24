
export type ConfigValue = string | number | boolean

export interface ConfigItem{
    key:string;
    value:ConfigValue;
    valueType:'int'|'decimal'|'bool'|'text';
    min:number|null;
    max:number|null;
    allowedValues:string[]|null;
    ownerOnly:boolean;
    description:string|null;
    updatedAt:string|null;
}

export interface ConfigListResponse{
    data:ConfigItem[];
}

export interface ConfigOneResponse{
    data:ConfigItem;
}