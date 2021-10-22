import {XToken} from "./XToken";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {CsvDecimalFormat, CsvSeparator, ExportType} from "../serverApi/ExportImportParam";
import {XResponseError} from "./XResponseError";
import React from "react";

export enum OperationType {
    None,
    Insert,
    Update,
    Remove
}

export class XUtils {

    static dropdownEmptyOptionValue: string = " ";

    static xServerUrl: string | null = null;

    // nacachovany XToken - na rozlicnych miestach potrebujeme vediet uzivatela
    static xToken: XToken | null = null;
    // token pouzivany pre public stranky (napr. XLoginForm), meno/heslo natvrdo (lepsie ako nic)
    static xTokenPublic: XToken = {username: "xPublicUser", password: "xPublicUserPassword123"};

    // nacachovane metadata (setuju sa v App.fetchAndSetXMetadata)
    private static appFormMap: {[name: string]: any;} = {};

    static exportTypeOptions = [ExportType.Csv, ExportType.Json];

    static csvSeparatorOptions = [CsvSeparator.Semicolon, CsvSeparator.Comma];

    static decimalFormatOptions = [CsvDecimalFormat.Comma, CsvDecimalFormat.Dot];

    static remSize: number | null = null;

    // konstanty (zatial takto jednoducho)
    static FIELD_LABEL_WIDTH: string = '10.5rem';

    static demo(): boolean {
        return XUtils.getXServerUrl().indexOf('x-demo-server') !== -1;
    }

    static isMobile(): boolean {
        // extra small displays (podla https://www.w3schools.com/howto/howto_css_media_query_breakpoints.asp)
        // mozno tu treba dat (window.screen.width * window.devicePixelRatio)
        // bolo 600 ($sm = 576 (primeflex)) - len ak bol mobil na vysku, 768 ma byt aj pre mobil na sirku
        return typeof window !== 'undefined' && window.screen.availWidth < 768; // $sm = 576 (primeflex)
    }

    static mobileCssSuffix(): string {
        return XUtils.isMobile() ? '-mobile' : '';
    }

    static toPX(size: string | undefined): number | undefined {
        let sizeInPx: number | undefined;
        if (size !== undefined) {
            if (size.endsWith('px')) {
                sizeInPx = parseFloat(size);
            }
            else if (size.endsWith('rem')) {
                sizeInPx = parseFloat(size) * XUtils.getRemSize();
            }
            if (Number.isNaN(sizeInPx)) {
                sizeInPx = undefined;
            }
        }
        return sizeInPx;
    }

    static toPX0(size: string | undefined): number {
        return XUtils.toPX(size) ?? 0;
    }

    static getRemSize(): number {
        if (XUtils.remSize === null) {
            // font-size of root element (HTML element), e.g. "14px"
            XUtils.remSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        }
        return XUtils.remSize;
    }

    // param example: "3rem md:4rem xl:6rem"
    // (in general: "<exp1> sm:<exp2> md:<exp3> lg:<exp4> xl:<exp5>")
    // according to device width returns "exp(n)"
    static processGridBreakpoints(breakpointExp: string): string | undefined {
        const breakpointList: string[] = breakpointExp.split(' ');
        // pridame si prefix xs: ak neni ziaden prefix, aby sa s tym lahsie pracovalo
        for (const [index, breakpoint] of breakpointList.entries()) {
            if (breakpoint !== '' && breakpoint.indexOf(':') === -1) {
                breakpointList[index] = 'xs:' + breakpoint;
            }
        }
        // TODO - use variables $sm, $md, ...
        let breakpointsToFind: string[];
        let availWidth;
        if (typeof window !== 'undefined') {
            availWidth = window.screen.availWidth; // pouzivame availWidth, nie width, availWidth odratava napr. taskbar
            if (availWidth < 576) {
                breakpointsToFind = ['xs:'];
            }
            else if (availWidth < 768) {
                breakpointsToFind = ['sm:', 'xs:'];
            }
            else if (availWidth < 992) {
                breakpointsToFind = ['md:', 'sm:', 'xs:'];
            }
            else if (availWidth < 1200) {
                breakpointsToFind = ['lg:', 'md:', 'sm:', 'xs:'];
            }
            else {
                breakpointsToFind = ['xl:', 'lg:', 'md:', 'sm:', 'xs:'];
            }
        }
        else {
            // desktop screen?
            breakpointsToFind = ['xl:', 'lg:', 'md:', 'sm:', 'xs:'];
        }
        for (const breakpointToFind of breakpointsToFind) {
            for (const breakpoint of breakpointList) {
                if (breakpoint.startsWith(breakpointToFind)) {
                    return breakpoint.substring(breakpointToFind.length);
                }
            }
        }
        // should not happen
        console.log(`XUtils.processGridBreakpoints: unexpected error: no breakpoint value found, breakpointExp = ${breakpointExp}, availWidth = ${availWidth}`);
        return undefined;
    }

    static processPropWidth(widthProp: string | undefined) : string | undefined {
        let width: string | undefined;
        if (widthProp !== undefined && widthProp !== null) {
            width = XUtils.processGridBreakpoints(widthProp);
            if (width !== undefined) {
                if (!isNaN(Number(width))) { // if width is number
                    width = width + 'rem';
                }
            }
        }
        return width;
    }

    static addCssPropIfNotExists(cssProps: React.CSSProperties, newCssProps: React.CSSProperties) {
        for (const [cssProp, cssPropValue] of Object.entries(newCssProps)) {
            if (!(cssProp in cssProps)) {
                (cssProps as any)[cssProp] = cssPropValue;
            }
        }
    }

    // zatial nepouzivane - v buducnosti sa takto mozu vytvorit registre browsov a formularov, ktore potom budeme vediet otvorit len na zaklade entity
    static registerAppBrowse(elem: any, entity: string, formId?: string): void {
        // console.log("***************** sme v register");
        // console.log(elem);
        // console.log(entity);
    }

    static registerAppForm(elem: any, entity: string, formId?: string): void {
        const formKey = XUtilsMetadata.getXBrowseFormMetaKey(entity, formId);
        XUtils.appFormMap[formKey] = elem;
    }

    static getAppForm(entity: string, formId?: string): any {
        const formKey = XUtilsMetadata.getXBrowseFormMetaKey(entity, formId);
        return XUtils.appFormMap[formKey];
    }

    static fetchMany(path: string, value: any, usePublicToken?: boolean | XToken): Promise<any[]> {
        return XUtils.fetch(path, value, usePublicToken);
    }

    static fetchOne(path: string, value: any, usePublicToken?: boolean | XToken): Promise<any> {
        return XUtils.fetch(path, value, usePublicToken);
    }

    static async fetchString(path: string, value: any): Promise<string> {
        const valueObj = await XUtils.fetch(path, value);
        return valueObj.value;
    }

    static async fetch(path: string, value: any, usePublicToken?: boolean | XToken): Promise<any> {
        const response = await XUtils.fetchBasicJson(path, value, usePublicToken);
        return await response.json();
    }

    static post(path: string, value: any): Promise<Response> {
        return XUtils.fetchBasicJson(path, value);
    }

    static fetchBasicJson(path: string, value: any, usePublicToken?: boolean | XToken): Promise<Response> {
        return XUtils.fetchBasic(path, {'Content-Type': 'application/json'}, XUtilsCommon.objectAsJSON(value), usePublicToken);
    }

    static async fetchFile(path: string, jsonFieldValue: any, fileToPost: any): Promise<any> {
        const formData = new FormData();
        formData.append(
            "jsonField",
            XUtilsCommon.objectAsJSON(jsonFieldValue)
        );
        formData.append(
            "fileField",
            fileToPost,
            fileToPost.name
        );
        // poznamka: metoda fetch automaticky prida do headers 'Content-Type': 'multipart/form-data' aj s boundery
        const response = await XUtils.fetchBasic(path, {}, formData);
        return await response.json();
    }

    static async fetchBasic(path: string, headers: any, body: any, usePublicToken?: boolean | XToken): Promise<Response> {
        let xToken: XToken | null;
        if (typeof usePublicToken === 'object') {
            xToken = usePublicToken;
        }
        else if (usePublicToken) {
            xToken = XUtils.xTokenPublic; // public token vzdy
        }
        else {
            xToken = XUtils.getXToken();
            if (xToken === null) {
                xToken = XUtils.xTokenPublic; // ak nikto nie je prihlaseny, posleme public token
            }
        }
        headers = {...headers,
            'Authorization': `Basic ${Buffer.from(xToken.username + ':' + xToken.password).toString('base64')}`
        };
        const response = await fetch(XUtils.getXServerUrl() + path, {
                                    method: 'POST',
                                    headers: headers,
                                    body: body
                                });
        if (!response.ok) {
            const responseBody = await response.json();
            throw new XResponseError(path, response.status, response.statusText, responseBody);
        }
        return response;
    }

    static fetchById(entity: string, fields: string[], id: number): Promise<any> {
        return XUtils.fetchOne('findRowById', {entity: entity, fields: fields, id: id})
    }

    static setXToken(xToken: XToken | null) {
        XUtils.xToken = xToken;
    }

    static getXToken(): XToken | null {
        return XUtils.xToken;
    }

    static getUsername(): string | undefined {
        return XUtils.getXToken()?.username;
    }

    static getXServerUrl(): string {
        if (XUtils.xServerUrl === null) {
            throw "XUtils.xServerUrl is null";
        }
        return XUtils.xServerUrl;
    }

    static setXServerUrl(xServerUrl: string) {
        XUtils.xServerUrl = xServerUrl;
    }

    // funkcionalita ktoru by bolo dobre dat do servisov

    static async removeRow(entity: string, row: any) {
        const xEntity: XEntity = XUtilsMetadata.getXEntity(entity);
        const id = row[xEntity.idField];
        await XUtils.post('removeRow', {entity: entity, id: id});
    }

    static arrayMoveElement(array: any[], position: number, offset: number) {
        const element = array[position];
        array.splice(position, 1);
        let positionNew = position + offset;
        if (positionNew > array.length) {
            positionNew = positionNew - array.length - 1; // element goes to the begin
        }
        else if (positionNew < 0) {
            positionNew = array.length + positionNew + 1; // element goes to the end
        }
        if (positionNew >= 0 && positionNew <= array.length) {
            array.splice(positionNew, 0, element);
        }
    }

    // helper
    static isReadOnly(path: string, readOnlyInit?: boolean): boolean {
        // ak mame path dlzky 2 a viac, field je vzdy readOnly
        let readOnly: boolean;
        if (!XUtilsCommon.isSingleField(path)) {
            readOnly = true;
        }
        else {
            readOnly = readOnlyInit ?? false;
        }
        return readOnly;
    }

    static markNotNull(label: string): string {
        return label + ' *';
    }

    static showErrorMessage(message: string, e: Error) {
        let msg = message + XUtilsCommon.newLine;
        if (e instanceof XResponseError) {
            msg += e.message + XUtilsCommon.newLine;
            msg += JSON.stringify(e.xResponseErrorBody, null, 4);
        }
        else if (e instanceof Error) {
            msg += e.message;
        }
        alert(msg);
    }

    // pouziva sa hlavne na inputy
    static createErrorProps(error: string | undefined): {} {
        return error ? {className: "p-invalid", tooltip: error, tooltipOptions: { className: 'pink-tooltip', position: 'bottom' }} : {};
    }

    // pomocna metodka pouzivana (zatial len) pre autocomplete na ignorovanie velkych-malych znakov a diakritiky
    static normalizeString(value: string): string {
        if (value) {
            // odstranuje vselijaku moznu diakritiku, pre nas je dolezite, ze zmeni "ľščťžýáíéúäňô" na "lsctzyaieuano"
            value = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
        return value;
    }
}