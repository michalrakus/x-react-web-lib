import {XEnumEnum} from "./x-enum-enum";

export interface XEnum {
    id: number;
    code: string;
    name: string;
    enabled: boolean;
    readOnly: boolean;
    enumOrder: number;
    xEnumEnum: XEnumEnum;
}
