import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import {XUtils} from "./XUtils";

export class XFormBaseModif extends XFormBase {

    preSave(object: XObject) {
        object.modifDate = new Date();
        object.modifXUser = XUtils.getXToken()?.xUser;
    }
}