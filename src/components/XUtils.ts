import {dateFormat} from "./XUtilsConversions";
import {XToken} from "./XToken";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";

export class XUtils {

    static dropdownEmptyOptionValue: string = " ";

    static xServerUrl: string | null = null;

    // nacachovany XToken - na rozlicnych miestach potrebujeme vediet uzivatela
    static xToken: XToken | null = null;
    // token pouzivany pre public stranky (napr. XLoginForm), meno/heslo natvrdo (lepsie ako nic)
    static xTokenPublic: XToken = {username: "xPublicUser", password: "xPublicUserPassword123"};

    // nacachovane metadata (setuju sa v App.fetchAndSetXMetadata)
    private static appFormMap: {[name: string]: any;} = {};

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
        const response = await XUtils.fetchBasic(path, value);
        if (!response.ok) {
            const errorMessage = `Http request "${path}" failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            throw errorMessage;
        }
        return await response.json();
    }

    static post(path: string, value: any): Promise<Response> {
        return XUtils.fetchBasic(path, value);
    }

    static fetchBasic(path: string, value: any): Promise<Response> {
        let xToken: XToken | null = XUtils.getXToken();
        if (xToken === null) {
            xToken = XUtils.xTokenPublic; // ak nikto nie je prihlaseny, posleme public token
        }
        const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(xToken.username + ':' + xToken.password).toString('base64')}`
        };
        return fetch(XUtils.getXServerUrl() + path, {
            method: 'POST',
            headers: headers,
            body: XUtils.objectAsJSON(value)
        });
    }

    static fetchById(entity: string, fields: string[], id: number): Promise<any> {
        return XUtils.fetchOne('findRowById', {entity: entity, fields: fields, id: id})
    }

    // TODO - toto by sme mohli doplnit o kontrolu ak programator urobil preklep
    static getValueByPath(object: any, path: string): any {
        const [field, restPath] = XUtils.getFieldAndRestPath(path);
        if (restPath === null) {
            return object[field];
        }
        else {
            const assocObject = object[field];
            // pri vytvarani noveho riadku - assocObject neni v novom objekte ani ako null (je undefined)
            if (assocObject !== null && assocObject !== undefined) {
                return XUtils.getValueByPath(assocObject, restPath);
            }
            else {
                return null; // asociovany objekt je null, aj hodnota atributu bude null
            }
        }
    }

    static getFieldListForPath(path: string): string[] {
        return path.split('.');
    }

    static getFieldAndRestPath(path: string): [string, string | null] {
        const posDot : number = path.indexOf(".");
        if (posDot === -1) {
            return [path, null];
        }
        else {
            const assocField = path.substring(0, posDot);
            const restPath = path.substring(posDot + 1);
            return [assocField, restPath];
        }
    }

    static objectAsJSON(value: any): string {

        // sem treba dat nejaku pre nas vhodnu serializaciu
        // zatial provizorne robene cez antipatern - modifikaciu prototype funcii primitivnych typov
        // TODO - bud pouzit nejaky serializator alebo nakodit vlastnu rekurzivnu iteraciu objektov alebo pouzit druhy parameter v JSON.stringify - konvertovaciu funkciu

        const dateToJSONOriginal = Date.prototype.toJSON;
        Date.prototype.toJSON = function () {
            // TODO - ak pre datetime nastavime vsetky zlozky casu na 00:00:00, tak sformatuje hodnotu ako datum a spravi chybu pri zapise do DB - zapise  1:00:00
            let dateStr: string;
            if (this.getHours() === 0 && this.getMinutes() === 0 && this.getSeconds() === 0) {
                dateStr = dateFormat(this, 'yyyy-mm-dd');
            }
            else {
                // jedna sa o datetime
                dateStr = dateFormat(this, 'yyyy-mm-dd HH:MM:ss');
            }
            return dateStr;
        }

        const json: string = JSON.stringify(value);

        // vratime naspet povodnu funkciu
        Date.prototype.toJSON = dateToJSONOriginal;

        return json;
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