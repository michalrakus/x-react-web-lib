import {XAssoc, XAssocMap, XEntity, XEntityMap, XField} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";

// idelany nazov: UtilsEntityMetadata - ale strasne dlhy
// tato funkcionalita by mala ist bud do tried XEntity, XField alebo lepsie do nejakeho servisu
export class XUtilsMetadata {
    // nacachovane metadata (setuju sa v App.fetchAndSetXEntityMap)
    static xEntityMap: XEntityMap;

    static async fetchAndSetXEntityMap(): Promise<any> {
        if (XUtilsMetadata.xEntityMap === undefined) {
            XUtilsMetadata.xEntityMap = await XUtils.fetch("getXEntityMap", {dummy: "dummy"});
            //console.log(XUtilsMetadata.xEntityMap);
        }
    }

    static getXEntity(entity: string): XEntity {
        const xEntity: XEntity = XUtilsMetadata.xEntityMap[entity];
        if (xEntity === undefined) {
            throw `Entity ${entity} was not found in entity metadata`;
        }
        return xEntity;
    }

    static getXField(xEntity: XEntity, field: string): XField {
        // TODO - pozor, vo fieldMap su aj asociacie, trebalo by zmenit vytvaranie metadat tak aby tam tie asociacie neboli
        const xField: XField = xEntity.fieldMap[field];
        if (xField === undefined) {
            throw `Field ${field} was not found in entity ${xEntity.name}`;
        }
        return xField;
    }

    static getXFieldByPath(xEntity: XEntity, path: string): XField {
        const [field, restPath] = XUtils.getFieldAndRestPath(path);
        if (restPath === null) {
            return XUtilsMetadata.getXField(xEntity, field);
        }
        else {
            const xAssoc: XAssoc = XUtilsMetadata.getXAssocToOne(xEntity, field);
            const xAssocEntity = XUtilsMetadata.getXEntity(xAssoc.entityName);
            return XUtilsMetadata.getXFieldByPath(xAssocEntity, restPath);
        }
    }

    static getXFieldByPathStr(entity: string, path: string): XField {
        return XUtilsMetadata.getXFieldByPath(XUtilsMetadata.getXEntity(entity), path);
    }

    static getXAssocToOne(xEntity: XEntity, assocField: string): XAssoc {
        return XUtilsMetadata.getXAssoc(xEntity, xEntity.assocToOneMap, assocField);
    }

    static getXAssocToMany(xEntity: XEntity, assocField: string): XAssoc {
        return XUtilsMetadata.getXAssoc(xEntity, xEntity.assocToManyMap, assocField);
    }

    static getXEntityForAssocToOne(xEntity: XEntity, assocField: string): XEntity {
        return XUtilsMetadata.getXEntityForAssoc(XUtilsMetadata.getXAssocToOne(xEntity, assocField));
    }

    static getXEntityForAssocToMany(xEntity: XEntity, assocField: string): XEntity {
        return XUtilsMetadata.getXEntityForAssoc(XUtilsMetadata.getXAssocToMany(xEntity, assocField));
    }

    // docasne sem, kym nemame jednotny XInputDecimal/XInputDecimalDT
    static getParamsForInputNumber(xField: XField): {useGrouping: boolean; fractionDigits?: number; min?: number; max?: number; size?: number} {
        let useGrouping: boolean = true;
        let fractionDigits: number | undefined = undefined;
        let precision: number | undefined = undefined; // total number of digits (before + after decimal point (scale))
        let size: number | undefined = undefined;
        if (xField.type === "decimal") {
            useGrouping = true;
            fractionDigits = xField.scale;
            precision = xField.precision;
            if (precision !== undefined) {
                size = precision + Math.floor(precision/3); // approximatly for 123.456.789,12
            }
        }
        else if (xField.type === "number") {
            useGrouping = false;
            fractionDigits = 0;
            precision = xField.width; // number pouziva width
            if (precision === undefined) {
                precision = xField.precision; // nech to aj takto zafunguje...
            }
            size = precision;
        }
        else {
            throw `XInputDecimal: field ${xField.name} has unsupported type ${xField.type}. Supported types are decimal and number.`;
        }
        let min: number | undefined = undefined;
        let max: number | undefined = undefined;
        if (precision !== undefined && fractionDigits !== undefined) {
            const digits = precision - fractionDigits;
            min = -(Math.pow(10, digits) - 1);
            max = Math.pow(10, digits) - 1;
        }

        return {useGrouping: useGrouping, fractionDigits: fractionDigits, min: min, max: max, size: size};
    }

    private static getXAssoc(xEntity: XEntity, assocMap: XAssocMap, assocField: string): XAssoc {
        const xAssoc: XAssoc = assocMap[assocField];
        if (xAssoc === undefined) {
            throw `Assoc ${assocField} was not found in entity = ${xEntity.name}`;
        }
        return xAssoc;
    }

    private static getXEntityForAssoc(xAssoc: XAssoc): XEntity {
        return XUtilsMetadata.getXEntity(xAssoc.entityName);
    }
}
