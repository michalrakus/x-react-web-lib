import {dateFormat} from "./XUtilsConversions";
import {XToken} from "./XToken";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";

export class XUtils {

    static dropdownEmptyOptionValue: string = " ";

    // zatial len takto
    static xServerUrl: string = 'http://localhost:8081/';
    //static xServerUrl: string = 'https://x-dev-nest-server-app.herokuapp.com/';

    // nacachovany XToken - na rozlicnych miestach potrebujeme vediet uzivatela
    static xToken: XToken | null = null;
    // token pouzivany pre public stranky (napr. XLoginForm), meno/heslo natvrdo (lepsie ako nic)
    static xTokenPublic: XToken = {username: "xPublicUser", password: "xPublicUserPassword123"};

    // zatial nepouzivane - v buducnosti sa takto mozu vytvorit registre browsov a formularov, ktore potom budeme vediet otvorit len na zaklade entity
    static registerBrowse(elem: any, entity: string, formId?: string): void {
        console.log("***************** sme v register");
        console.log(elem);
        console.log(entity);
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
        return await response.json();
    }

    static post(path: string, value: any): Promise<Response> {
        // TODO - treba cakat nejaku odpoved? ak nedame, tak pri error-e sa o chybe nedozvieme
        // zatial necakame na odpoved
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
        return fetch(XUtils.xServerUrl + path, {
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

    // funkcionalita ktoru by bolo dobre dat do servisov

    static removeRow(entity: string, row: any): Promise<Response> {
        const xEntity: XEntity = XUtilsMetadata.getXEntity(entity);
        const id = row[xEntity.idField];
        return XUtils.post('removeRow', {entity: entity, id: id});
    }
}