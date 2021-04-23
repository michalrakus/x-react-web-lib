import {XToken} from "./XToken";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {dateFormat, XUtilsCommon} from "../serverApi/XUtilsCommon";
import {CsvDecimalFormat, CsvSeparator, ExportType} from "../serverApi/ExportImportParam";

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

    static demo(): boolean {
        return XUtils.getXServerUrl().indexOf('x-demo-server') !== -1;
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

    static fetchMany(path: string, value: any): Promise<any[]> {
        return XUtils.fetch(path, value);
    }

    static fetchOne(path: string, value: any): Promise<any> {
        return XUtils.fetch(path, value);
    }

    static async fetchString(path: string, value: any): Promise<string> {
        const valueObj = await XUtils.fetch(path, value);
        return valueObj.value;
    }

    static async fetch(path: string, value: any): Promise<any> {
        const response = await XUtils.fetchBasicJson(path, value);
        if (!response.ok) {
            const errorMessage = `Http request "${path}" failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            throw errorMessage;
        }
        return await response.json();
    }

    // to iste co XUtils.post (request ktory nevracia json), ale navyse overujeme response.ok
    static async fetchNoResponse(path: string, value: any) {
        const response: Response = await XUtils.fetchBasicJson(path, value);
        if (!response.ok) {
            const errorMessage = `Http request "${path}" failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            throw errorMessage;
        }
    }

    static post(path: string, value: any): Promise<Response> {
        return XUtils.fetchBasicJson(path, value);
    }

    static fetchBasicJson(path: string, value: any): Promise<Response> {
        return XUtils.fetchBasic(path, {'Content-Type': 'application/json'}, XUtilsCommon.objectAsJSON(value));
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
        if (!response.ok) {
            const errorMessage = `Http request "${path}" failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            throw errorMessage;
        }
        return await response.json();
    }

    static fetchBasic(path: string, headers: any, body: any): Promise<Response> {
        let xToken: XToken | null = XUtils.getXToken();
        if (xToken === null) {
            xToken = XUtils.xTokenPublic; // ak nikto nie je prihlaseny, posleme public token
        }
        headers = {...headers,
            'Authorization': `Basic ${Buffer.from(xToken.username + ':' + xToken.password).toString('base64')}`
        };
        return fetch(XUtils.getXServerUrl() + path, {
            method: 'POST',
            headers: headers,
            body: body
        });
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
        const response = await XUtils.post('removeRow', {entity: entity, id: id});
        if (!response.ok) {
            const errorMessage = `Remove row failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            alert(errorMessage);
        }
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
}