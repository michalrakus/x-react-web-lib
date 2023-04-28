import {OperationType} from "./XUtils";
import {XObject} from "./XObject";

// event pre onChange metody na komponentoch formulara (XInputText, XAutoComplete, ...)
// pouzivame event, aby sme v buducnosti vedeli pridat dalsie atributy do eventu ak bude treba
// assocObjectChange - info ci bol vybraty assoc object zmeneny v DB (pozri XAutoCompleteBase)
// M znamena model
// TODO - OperationType sem presunut
export interface XFieldChangeEvent<M = XObject> {
    object: M;
    assocObjectChange?: OperationType
}

export interface XTableFieldChangeEvent<M = XObject, R = any> {
    object: M;
    tableRow: R;
    assocObjectChange?: OperationType
}