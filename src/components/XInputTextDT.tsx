import {XFormBase} from "./XFormBase";
import React from "react";
import {InputText} from "primereact/inputtext";
import {stringAsUI, stringFromUI} from "../serverApi/XUtilsConversions";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XTableFieldReadOnlyProp} from "./XFormDataTable2";
import {XUtils} from "./XUtils";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XInputTextDT = (props: {form: XFormBase; entity: string; field: string; rowData: any; readOnly?: XTableFieldReadOnlyProp}) => {

    const xField = XUtilsMetadataCommon.getXFieldByPathStr(props.entity, props.field);

    const onValueChange = (field: string, rowData: any, newValue: any) => {

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = stringFromUI(newValue);
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    let fieldValue = "";
    // test na undefined je tu koli insertu noveho riadku
    if (props.rowData !== undefined && props.rowData !== null) {
        let rowDataValue = XUtilsCommon.getValueByPath(props.rowData, props.field);
        //  pri inserte noveho riadku su (zatial) vsetky fieldy undefined, dame na null, null je standard
        if (rowDataValue === undefined) {
            rowDataValue = null;
        }
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli (a tiez aby korektne pridal novy riadok)
        fieldValue = stringAsUI(rowDataValue);
    }

    const readOnly: boolean = XUtils.isReadOnlyTableField(props.field, props.readOnly, props.form.state.object, props.rowData);

    return (
        <InputText id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.target.value)}
                   readOnly={readOnly} maxLength={xField.length} className="x-input-to-resize"/>
    );

}