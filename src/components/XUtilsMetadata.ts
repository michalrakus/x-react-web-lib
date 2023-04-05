import {XAssoc, XAssocMap, XEntity, XEntityMap, XField} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XBrowseMeta, XBrowseMetaMap} from "../serverApi/XBrowseMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

// idelany nazov: UtilsEntityMetadata - ale strasne dlhy
// tato funkcionalita by mala ist bud do tried XEntity, XField alebo lepsie do nejakeho servisu
// ekvivalentna funkcionalita sa nachadza aj na servri v servise XEntityMetadataService.ts (TODO - v buducnosti spravit spolocnu triedu/servis)
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
        const [field, restPath] = XUtilsCommon.getFieldAndRestPath(path);
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

    static getXAssocToOneByAssocEntity(xEntity: XEntity, assocEntityName: string): XAssoc {
        return XUtilsMetadata.getXAssocByAssocEntity(xEntity, xEntity.assocToOneMap, assocEntityName);
    }

    static getXAssocToManyByAssocEntity(xEntity: XEntity, assocEntityName: string): XAssoc {
        return XUtilsMetadata.getXAssocByAssocEntity(xEntity, xEntity.assocToManyMap, assocEntityName);
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

    //static CHAR_SIZE: number = 0.57; // 0.57rem (8px)
    static CHAR_SIZE: number = 0.5; // 0.5rem (7px) - skusime

    static computeColumnWidth(xField: XField, filterMenuInFilterRow: boolean, formColumnType: string | undefined, header: string | undefined, filterButtonInHeader: boolean): string | undefined {
        let width: number | undefined;
        if (formColumnType === undefined) {
            // lazy datatable (no inputs, no buttons, only text and padding)
            if (xField.type === "string") {
                width = XUtilsMetadata.computeColumnWidthBase(xField.length, 0.5 + 0.5); // padding 7px + 7px
            }
            else if (xField.type === "decimal" || xField.type === "number") {
                const {size} = XUtilsMetadata.getParamsForInputNumber(xField);
                width = XUtilsMetadata.computeColumnWidthBase(size, 0.5 + 0.5);
            }
            else if (xField.type === "date") {
                width = XUtilsMetadata.computeColumnWidthBase(10, 0.5 + 0.5); // napr. 31.12.2021
            }
            else if (xField.type === "datetime") {
                width = XUtilsMetadata.computeColumnWidthBase(10 + 9, 0.5 + 0.5); // napr. 31.12.2021 03:03:00
            }
            else if (xField.type === "boolean") {
                width = 1.43 + 0.5 + 0.5; // checkbox ma sirku 20px
            }
            else {
                throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
            }
        }
        else {
            // form datatable (formColumnType is defined)
            if (formColumnType === "inputSimple") {
                const padding = 0.21 + 0.07 + 0.5; // padding is 2.94px + 1px border + 7px padding in input
                if (xField.type === "string") {
                    width = XUtilsMetadata.computeColumnWidthBase(xField.length, padding + padding); // padding left + right
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const {size} = XUtilsMetadata.getParamsForInputNumber(xField);
                    width = XUtilsMetadata.computeColumnWidthBase(size, padding + padding);
                }
                else if (xField.type === "date") {
                    width = 0.21 + 6 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                }
                else if (xField.type === "datetime") {
                    width = 0.21 + 10 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                }
                else if (xField.type === "boolean") {
                    width = 1.43 + 0.5 + 0.5; // checkbox ma sirku 20px
                }
                else {
                    throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
                }
            }
            else if (formColumnType === "dropdown" || formColumnType === "searchButton" || formColumnType === "autoComplete") {
                // vyratame sirku inputu
                const padding = 0.21 + 0.07 + 0.5; // padding is 2.94px + 1px border + 7px padding in input
                if (xField.type === "string") {
                    width = XUtilsMetadata.computeColumnWidthBase(xField.length, padding + padding); // padding left + right
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const {size} = XUtilsMetadata.getParamsForInputNumber(xField);
                    width = XUtilsMetadata.computeColumnWidthBase(size, padding + padding);
                }
                else if (xField.type === "date") {
                    width = XUtilsMetadata.computeColumnWidthBase(10, padding + padding); // napr. 31.12.2021
                }
                else if (xField.type === "datetime") {
                    width = XUtilsMetadata.computeColumnWidthBase(10 + 9, padding + padding); // napr. 31.12.2021 03:03:00
                }
                else {
                    throw `XField ${xField.name}: xField.type = ${xField.type} not implemented for dropdown/searchButton/autoComplete`;
                }
                // pridame sirku buttonu
                if (formColumnType === "dropdown") {
                    if (width !== undefined) {
                        width += 2; // button for dropdown
                    }
                }
                else if (formColumnType === "searchButton") {
                    if (width !== undefined) {
                        width += 2.18; // button for search button
                    }
                }
                else if (formColumnType === "autoComplete") {
                    throw `XField ${xField.name}: computing button width not implemented for autoComplete`;
                }
            }
            else {
                throw "Unknown prop type = " + formColumnType;
            }
        }
        if (filterMenuInFilterRow) {
            // if the column has width of 25 characters or more, then the input field can be shorter
            if (width !== undefined && width < 25 * XUtilsMetadata.CHAR_SIZE) {
                width += 1.25; // filter menu icon
            }
        }
        // ak je label dlhsi ako sirka stlpca, tak sirka stlpca bude podla label-u
        if (header !== undefined) {
            let widthHeader = XUtilsMetadata.computeColumnWidthBase(header.length, 0.5 + 0.5 + 1.28); // padding (7px) + space (7px) + sort icon (18px)
            if (filterButtonInHeader && widthHeader !== undefined) {
                widthHeader += 1.5; // filter icon (21px = 14px (icon body) + 7px (right padding))
            }
            if (widthHeader !== undefined) {
                if (width === undefined || widthHeader > width) {
                    width = widthHeader;
                }
            }
        }

        return width !== undefined ? width.toString() + 'rem' : undefined;
    }

    static computeColumnWidthBase(charSize?: number, paddingAndOther?: number): number | undefined {
        let width: number | undefined;
        if (charSize !== undefined) {
            width = charSize * XUtilsMetadata.CHAR_SIZE; // character size (8px)
        }
        if (width !== undefined && paddingAndOther !== undefined) {
            width += paddingAndOther;
        }
        return width;
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

    private static getXAssocByAssocEntity(xEntity: XEntity, assocMap: XAssocMap, assocEntityName: string): XAssoc {
        let xAssocFound: XAssoc | undefined = undefined;
        for (const [key, xAssoc] of Object.entries(assocMap)) {
            if (xAssoc.entityName === assocEntityName) {
                if (xAssocFound === undefined) {
                    xAssocFound = xAssoc;
                }
                else {
                    throw `In entity ${xEntity.name} found more then 1 assoc for assocEntityName = ${assocEntityName}`;
                }
            }
        }
        if (xAssocFound === undefined) {
            throw `Assoc for assocEntityName = ${assocEntityName} not found in entity ${xEntity.name}`;
        }
        return xAssocFound;
    }

    private static getXEntityForAssoc(xAssoc: XAssoc): XEntity {
        return XUtilsMetadata.getXEntity(xAssoc.entityName);
    }
}
