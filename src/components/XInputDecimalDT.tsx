import {XFormBase} from "./XFormBase";
import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export const XInputDecimalDT = (props: {form: XFormBase; entity: string; field: string; rowData: any; readOnly?: boolean}) => {

    const xField = XUtilsMetadata.getXFieldByPathStr(props.entity, props.field);
    const {useGrouping, fractionDigits, min, max} = XUtilsMetadata.getParamsForInputNumber(xField);

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
        // z InputNumber prichadza e.value - typ number alebo null

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    let fieldValue: number | undefined = undefined;
    // test na undefined je tu koli insertu noveho riadku
    if (props.rowData !== undefined && props.rowData !== null) {
        let rowDataValue = XUtilsCommon.getValueByPath(props.rowData, props.field);
        //  pre istotu dame na null, null je standard
        //if (rowDataValue === undefined) {
        //    rowDataValue = null;
        //}

        // TODO - konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        // - otestovat ci zmena na null funguje dobre -
        //fieldValue = stringAsUI(rowDataValue);

        // tuto zatial hack, mal by prist number
        if (typeof rowDataValue === 'string') {
            fieldValue = parseFloat(rowDataValue);
        }
        else if (typeof rowDataValue === 'number') {
            fieldValue = rowDataValue;
        }
        // fieldValue zostalo undefined (konvertujeme null -> undefined) - InputNumber pozaduje undefined, nechce null
    }

    return (
        <InputNumber id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.value)} readOnly={readOnly} mode="decimal" locale="de-DE"
                     useGrouping={useGrouping} minFractionDigits={fractionDigits} maxFractionDigits={fractionDigits} min={min} max={max} className="x-input-to-resize"/>
    );
}