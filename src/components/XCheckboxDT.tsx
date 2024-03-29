import {XFormBase} from "./XFormBase";
import React from "react";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XTableFieldReadOnlyProp} from "./XFormDataTable2";
import {XUtils} from "./XUtils";

export const XCheckboxDT = (props: {form: XFormBase; xField: XField; field: string; rowData: any; readOnly?: XTableFieldReadOnlyProp}) => {

    const onValueChange = (field: string, rowData: any, newValue: boolean | null) => {
        // pri klikani na TriStateCheckbox prichadza v newValue cyklicky: true -> false -> null
        // ak mame not null atribut, tak pri null hodnote skocime rovno na true
        if (!props.xField.isNullable) {
            if (newValue === null) {
                newValue = true;
            }
        }

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    let fieldValue: boolean | null = null;
    // test na undefined je tu koli insertu noveho riadku
    if (props.rowData !== undefined && props.rowData !== null) {
        let rowDataValue = XUtilsCommon.getValueByPath(props.rowData, props.field);
        //  pri inserte noveho riadku su (zatial) vsetky fieldy undefined, dame na null, null je standard
        if (rowDataValue === undefined) {
            rowDataValue = null;
        }
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli (a tiez aby korektne pridal novy riadok)
        fieldValue = rowDataValue;
    }

    const readOnly: boolean = XUtils.isReadOnlyTableField(props.field, props.readOnly, props.form.state.object, props.rowData);

    return (
        <TriStateCheckbox id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.value)}
                   disabled={readOnly}/>
    );

}