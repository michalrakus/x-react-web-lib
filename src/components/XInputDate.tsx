import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import {XUtils} from "./XUtils";
import React from "react";
import {Calendar} from "primereact/calendar";
import {dateFormatCalendar} from "./XUtilsConversions";
import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";

export const XInputDate = (props: {form: XFormBase<XObject>; field: string; label?: string; readOnly?: boolean}) => {

    props.form.addField(props.field);

    const xField: XField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);
    const showTime: boolean = (xField.type === 'datetime');

    const label = props.label !== undefined ? props.label : props.field;
    // ak mame path, field je vzdy readOnly
    let readOnly: boolean;
    const posDot : number = props.field.indexOf(".");
    if (posDot !== -1) {
        readOnly = true;
    }
    else {
        readOnly = props.readOnly !== undefined ? props.readOnly : false;
    }

    const onValueChange = (e: any) => {
        // z Calendar prichadza e.value - typ Date alebo null
        // typ Date prichadza ak uzivatel vyplnil validny datum, null (typeof e.value vracia "object") prichadza ak uzivatel vymazal datum
        // alebo je este datum nekompletny (uzivatel prave zadava datum)
        //console.log(typeof e.value);
        //console.log(e.value instanceof Date);
        props.form.onFieldChange(props.field, e.value);
    }

    let fieldValue: Date | undefined = undefined;
    const object: XObject | null = props.form.state.object;
    if (object !== null) {
        let objectValue = XUtils.getValueByPath(object, props.field);
        //  pre istotu dame na null, null je standard
        //if (objectValue === undefined) {
        //    objectValue = null;
        //}

        // TODO - konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        // - otestovat ci zmena na null funguje dobre -
        //fieldValue = stringAsUI(objectValue);

        // tuto zatial hack, mal by prist Date
        if (typeof objectValue === 'string') {
            fieldValue = new Date(objectValue);
        }
        else if (typeof objectValue === 'object' && objectValue instanceof Date) {
            fieldValue = objectValue;
        }
        // fieldValue zostalo undefined (konvertujeme null -> undefined) - Calendar pozaduje undefined, nechce null
    }

    return (
        <div className="p-field p-grid">
            <label htmlFor={props.field} className="p-col-fixed" style={{width:'150px'}}>{label}</label>
            <Calendar id={props.field} value={fieldValue} onChange={onValueChange} disabled={readOnly} showIcon={true} dateFormat={dateFormatCalendar()} showTime={showTime} showSeconds={showTime}/>
        </div>
    );
}