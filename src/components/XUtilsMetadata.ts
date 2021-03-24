import {XAssoc, XAssocMap, XEntity, XEntityMap, XField} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XBrowseMeta, XBrowseMetaMap} from "../serverApi/XBrowseMetadata";

// idelany nazov: UtilsEntityMetadata - ale strasne dlhy
// tato funkcionalita by mala ist bud do tried XEntity, XField alebo lepsie do nejakeho servisu
export class XUtilsMetadata {
    // nacachovane metadata (setuju sa v App.fetchAndSetXMetadata)
    private static xEntityMap: XEntityMap;
    // nacachovane metadata (setuju sa v App.fetchAndSetXMetadata)
    private static xBrowseMetaMap: XBrowseMetaMap;

    static async fetchAndSetXEntityMap(): Promise<any> {
        if (XUtilsMetadata.xEntityMap === undefined) {
            XUtilsMetadata.xEntityMap = await XUtils.fetch("getXEntityMap", {dummy: "dummy"});
            //console.log(XUtilsMetadata.xEntityMap);
        }
    }

    static async fetchAndSetXBrowseMetaMap(): Promise<any> {
        if (XUtilsMetadata.xBrowseMetaMap === undefined) {
            XUtilsMetadata.xBrowseMetaMap = await XUtils.fetch("getXBrowseMetaMap", {dummy: "dummy"});
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

    static getXFieldList(xEntity: XEntity): XField[] {
        const xFieldList: XField[] = [];
        for (const [key, xField] of Object.entries(xEntity.fieldMap)) {
            // assoc fieldy sa nachadzaju aj v xEntity.fieldMap ako typ number (netusim preco), preto ich vyfiltrujeme
            if (xEntity.assocToOneMap[xField.name] === undefined) {
                xFieldList.push(xField);
            }
        }
        return xFieldList;
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

    static CHAR_SIZE: number = 8;

    static computeColumnWidth(xField: XField, formColumnType?: string): string | undefined {
        let width: number | undefined;
        if (xField.type === "string") {
            if (xField.length !== undefined) {
                width = xField.length * XUtilsMetadata.CHAR_SIZE + 7 + 7; // character size (8px) and padding left/right (7px + 7px)
            }
        }
        else if (xField.type === "decimal" || xField.type === "number") {
            const {size} = XUtilsMetadata.getParamsForInputNumber(xField);
            if (size !== undefined) {
                width = size * XUtilsMetadata.CHAR_SIZE + 7 + 7;
            }
        }
        else if (xField.type === "date") {
            width = 85 + 7 + 7; // also in App.css defined
        }
        else if (xField.type === "datetime") {
            width = 145 + 7 + 7; // also in App.css defined
        }
        else if (xField.type === "boolean") {
            width = 7 + 7 + 7; // zatial takto provizorne
        }
        else {
            throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
        }
        // in form datatable, buttons may add some additional width
        if (formColumnType !== undefined) {
            if (formColumnType === "inputSimple") {
                if (xField.type === "date" || xField.type === "datetime") {
                    if (width !== undefined) {
                        width += 33; // button for calendar
                    }
                }
            }
            else if (formColumnType === "dropdown") {
                if (width !== undefined) {
                    width += 33; // button for dropdown
                }
            }
            else if (formColumnType === "searchButton") {
                if (width !== undefined) {
                    width += 39; // button for search button
                }
            }
            else {
                throw "Unknown prop type = " + formColumnType;
            }
        }
        return width !== undefined ? width.toString() + 'px' : undefined;
    }

    static getXBrowseMeta(entity: string, browseId?: string): XBrowseMeta {
        const key = XUtilsMetadata.getXBrowseFormMetaKey(entity, browseId);
        const xBrowseMeta: XBrowseMeta = XUtilsMetadata.xBrowseMetaMap[key];
        return xBrowseMeta;
    }

    static setXBrowseMeta(entity: string, browseId: string | undefined, xBrowseMeta: XBrowseMeta) {
        const key = XUtilsMetadata.getXBrowseFormMetaKey(entity, browseId);
        XUtilsMetadata.xBrowseMetaMap[key] = xBrowseMeta;
    }

    static getXBrowseFormMetaKey(entity: string, browseId?: string): string {
        let key = entity;
        if (browseId !== undefined) {
            key = key + '_' + browseId;
        }
        return key;
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
