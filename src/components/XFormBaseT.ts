import {XFormBase} from "./XFormBase";

// wrapper pre typ, nie je nutne tento wrapper pouzivat, da sa extendovat priamo od XFormBase
export abstract class XFormBaseT<T> extends XFormBase {

    getObject(): T {
        return this.getXObject() as any;
    }
}
