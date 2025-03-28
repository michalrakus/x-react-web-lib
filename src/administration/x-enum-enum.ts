import {XUser} from "../serverApi/XUser";
import {XEnum} from "./x-enum";

export interface XEnumEnum {
    id: number;
    code: string;
    name: string;
    readOnly: boolean;
    xEnumList: XEnum[];
    modifDate: Date;
    modifXUser: XUser;
    version: number;
}