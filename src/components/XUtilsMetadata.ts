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
