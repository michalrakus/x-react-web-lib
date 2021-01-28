import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React from "react";
import {XUtils} from "./XUtils";
import {InputText} from "primereact/inputtext";
import {stringAsUI, stringFromUI} from "./XUtilsConversions";

export const XInputTextDT = (props: {form: XFormBase<XObject>; field: string; rowData: any; readOnly?: boolean}) => {

    // ak mame path, field je vzdy readOnly
    let readOnly: boolean;
    const posDot : number = props.field.indexOf(".");
    if (posDot !== -1) {
        readOnly = true;
    }
    else {
        readOnly = props.readOnly !== undefined ? props.readOnly : false;
    }

    const onValueChange = (field: string, rowData: any, newValue: any) => {
        //console.log("onBodyValueChange");

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = stringFromUI(newValue);
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    let fieldValue = "";
    // test na undefined je tu koli insertu noveho riadku
    if (props.rowData !== undefined && props.rowData !== null) {
        let rowDataValue = XUtils.getValueByPath(props.rowData, props.field);
        //  pri inserte noveho riadku su (zatial) vsetky fieldy undefined, dame na null, null je standard
        if (rowDataValue === undefined) {
            rowDataValue = null;
        }
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli (a tiez aby korektne pridal novy riadok)
        fieldValue = stringAsUI(rowDataValue);
    }
    return (
        <InputText id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.target.value)} readOnly={readOnly}/>
    );

}