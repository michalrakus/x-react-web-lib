import {XFormBase} from "./XFormBase";
import {dateFormatCalendar} from "./XUtilsConversions";
import {XField} from "../serverApi/XEntityMetadata";
import {Calendar} from "primereact/calendar";
import React from "react";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export const XInputDateDT = (props: {form: XFormBase; xField: XField; field: string; rowData: any; readOnly?: boolean}) => {

    const showTime: boolean = (props.xField.type === 'datetime');
    const cssClassName = showTime ? 'x-input-datetime' : 'x-input-date';

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
        // z Calendar prichadza e.value - typ Date alebo null

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    let fieldValue: Date | undefined = undefined;
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

        // tuto zatial hack, mal by prist Date
        if (typeof rowDataValue === 'string') {
            fieldValue = new Date(rowDataValue);
        }
        else if (typeof rowDataValue === 'object' && rowDataValue instanceof Date) {
            fieldValue = rowDataValue;
        }
        // fieldValue zostalo undefined (konvertujeme null -> undefined) - Calendar pozaduje undefined, nechce null
    }

    // TODO - nefunguje dobre pridavanie noveho riadku - su tam stare neupdatnute hodnoty - este to asi neopravili https://github.com/primefaces/primereact/issues/1277
    // test mame na TestovaciForm

    return (
        <Calendar id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.value)} disabled={readOnly} showIcon={true}
                  dateFormat={dateFormatCalendar()} showTime={showTime} showSeconds={showTime} inputClassName={cssClassName} showOnFocus={false}/>
    );
}