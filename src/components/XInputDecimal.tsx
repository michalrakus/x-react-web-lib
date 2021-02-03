import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import {XUtils} from "./XUtils";
import React from "react";
import {InputNumber} from "primereact/inputnumber";

export const XInputDecimal = (props: {form: XFormBase; field: string; label?: string; readOnly?: boolean}) => {

    props.form.addField(props.field);

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
        // z InputNumber prichadza e.value - typ number alebo null
        props.form.onFieldChange(props.field, e.value);
    }

    let fieldValue: number | undefined = undefined;
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

        // tuto zatial hack, mal by prist number
        if (typeof objectValue === 'string') {
            fieldValue = parseFloat(objectValue);
        }
        else if (typeof objectValue === 'number') {
            fieldValue = objectValue;
        }
        // fieldValue zostalo undefined (konvertujeme null -> undefined) - InputNumber pozaduje undefined, nechce null
    }

    return (
        <div className="p-field p-grid">
            <label htmlFor={props.field} className="p-col-fixed" style={{width:'150px'}}>{label}</label>
            <InputNumber id={props.field} value={fieldValue} onChange={onValueChange} disabled={readOnly} mode="decimal" locale="de-DE" minFractionDigits={2} maxFractionDigits={2}/>
        </div>
    );
}