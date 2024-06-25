import {XField} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XBrowseMeta, XBrowseMetaMap} from "../serverApi/XBrowseMetadata";
import {XBetweenFilterProp} from "./XLazyDataTable/XLazyDataTable";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

// idelany nazov: UtilsEntityMetadata - ale strasne dlhy
// tato funkcionalita by mala ist bud do tried XEntity, XField alebo lepsie do nejakeho servisu
// ekvivalentna funkcionalita sa nachadza aj na servri v servise XEntityMetadataService.ts (TODO - v buducnosti spravit spolocnu triedu/servis)
export class XUtilsMetadata {
    // nacachovane metadata (setuju sa v App.fetchAndSetXMetadata)
    private static xBrowseMetaMap: XBrowseMetaMap;

    static async fetchAndSetXEntityMap(): Promise<any> {
        if (XUtilsMetadataCommon.getXEntityMap() === undefined) {
            XUtilsMetadataCommon.setXEntityMap(await XUtils.fetch("getXEntityMap", {dummy: "dummy"}));
        }
    }

    static async fetchAndSetXBrowseMetaMap(): Promise<any> {
        if (XUtilsMetadata.xBrowseMetaMap === undefined) {
            XUtilsMetadata.xBrowseMetaMap = await XUtils.fetch("getXBrowseMetaMap", {dummy: "dummy"});
        }
    }

    // docasne sem, kym nemame jednotny XInputDecimal/XInputDecimalDT
    static getParamsForInputNumber(xField: XField): {useGrouping: boolean; fractionDigits?: number; min?: number; max?: number; size?: number} {
        let useGrouping: boolean = true;
        let scale: number | undefined = undefined;
        let precision: number | undefined = undefined; // total number of digits (before + after decimal point (scale))
        let size: number | undefined = undefined;
        if (xField.type === "decimal") {
            useGrouping = true;
            scale = xField.scale;
            precision = xField.precision;
            if (precision !== undefined) {
                size = precision + Math.floor(precision/3); // approximatly for 123.456.789,12
            }
        }
        else if (xField.type === "number") {
            useGrouping = false;
            scale = 0;
            precision = xField.width; // number pouziva width
            if (precision === undefined) {
                precision = xField.precision; // nech to aj takto zafunguje...
            }
            size = precision;
        }
        else {
            throw `XInputDecimal: field ${xField.name} has unsupported type ${xField.type}. Supported types are decimal and number.`;
        }

        return XUtilsMetadata.getParamsForInputNumberBase(useGrouping, scale, precision, size);
    }

    static getParamsForInputNumberBase(
        useGrouping: boolean,
        scale: number | undefined,
        precision: number | undefined,  // total number of digits (before + after decimal point (scale))
        size: number | undefined
    ): {useGrouping: boolean; fractionDigits?: number; min?: number; max?: number; size?: number} {
        let min: number | undefined = undefined;
        let max: number | undefined = undefined;
        if (precision !== undefined && scale !== undefined) {
            const digits = precision - scale;
            min = -(Math.pow(10, digits) - 1);
            max = Math.pow(10, digits) - 1;
        }

        return {useGrouping: useGrouping, fractionDigits: scale, min: min, max: max, size: size};
    }

    //static CHAR_SIZE: number = 0.57; // 0.57rem (8px)
    static CHAR_SIZE: number = 0.5; // 0.5rem (7px) - skusime

    static computeColumnWidth(xField: XField, betweenFilter: XBetweenFilterProp, filterMenuInFilterRow: boolean, formColumnType: string | undefined, header: string | undefined, sortableButtonInHeader: boolean, filterButtonInHeader: boolean): string | undefined {
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
                width = XUtilsMetadata.computeColumnWidthBase(11, 0.25 + 1.25 + 0.25); // napr. 31.12.2021 (poznamka: dal som 11 lebo vo filtri nebolo vidno cely datum), 1.25 rem date picker button
            }
            else if (xField.type === "datetime") {
                width = XUtilsMetadata.computeColumnWidthBase(10 + 9, 0.25 + 1.25 + 0.25); // napr. 31.12.2021 03:03:00
            }
            else if (xField.type === "boolean") {
                width = 1.43 + 0.5 + 0.5; // checkbox ma sirku 20px
            }
            else {
                throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
            }
            if (betweenFilter === "row" && width) {
                width *= 2;
            }
        }
        else {
            // form datatable (formColumnType is defined)
            if (formColumnType === "inputSimple" || formColumnType === "textarea") {
                const padding = 0.21 + 0.07 + 0.5; // padding is 2.94px + 1px border + 7px padding in input
                if (xField.type === "string") {
                    width = XUtilsMetadata.computeColumnWidthBase(xField.length, padding + padding); // padding left + right
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const {size} = XUtilsMetadata.getParamsForInputNumber(xField);
                    width = XUtilsMetadata.computeColumnWidthBase(size, padding + padding);
                    if (betweenFilter === "row" && width) {
                        width *= 2; // not tested, only estimation
                    }
                }
                else if (xField.type === "date") {
                    if (betweenFilter === "row") {
                        width = (0.21 + 6 + 1.25 + 0.21) * 2; // not tested, only estimation
                    }
                    else {
                        width = 0.21 + 6 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                    }
                }
                else if (xField.type === "datetime") {
                    if (betweenFilter === "row") {
                        width = (0.21 + 10 + 1.25 + 0.21) * 2; // not tested, only estimation
                    }
                    else {
                        width = 0.21 + 10 + 2.36 + 0.21; // padding + input (also in App.css defined) + button + padding
                    }
                }
                else if (xField.type === "boolean") {
                    width = 1.43 + 0.5 + 0.5; // checkbox ma sirku 20px
                }
                else {
                    throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
                }
            }
            else if (formColumnType === "dropdown" || formColumnType === "autoComplete" || formColumnType === "searchButton") {
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
                    throw `XField ${xField.name}: xField.type = ${xField.type} not implemented for dropdown/autoComplete/searchButton`;
                }
                // pridame sirku buttonu
                if (formColumnType === "dropdown") {
                    if (width !== undefined) {
                        width += 2; // button for dropdown
                    }
                }
                else if (formColumnType === "autoComplete") {
                    if (width !== undefined) {
                        width += 1.56; // button for auto complete
                    }
                }
                else if (formColumnType === "searchButton") {
                    if (width !== undefined) {
                        width += 2.18; // button for search button
                    }
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
            let widthHeader = XUtilsMetadata.computeColumnWidthBase(header.length, 0.5); // padding (7px)
            if (sortableButtonInHeader && widthHeader !== undefined) {
                widthHeader += 0.5 + 1.28; // sort icon (25px = 7px (space/margin) + 18px (icon body))
            }
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
}
