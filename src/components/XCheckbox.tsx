import React from "react";
import {XFormBase} from "./XFormBase";
import { XObject } from "./XObject";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export const XCheckbox = (props: {form: XFormBase; field: string; label?: string; readOnly?: boolean; inputStyle?: React.CSSProperties;}) => {

    props.form.addField(props.field);

    const xField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);

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
        let newValue: boolean | null = e.value;
        // pri klikani na TriStateCheckbox prichadza v newValue cyklicky: true -> false -> null
        // ak mame not null atribut, tak pri null hodnote skocime rovno na true
        if (!xField.isNullable) {
            if (newValue === null) {
                newValue = true;
            }
        }

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        props.form.onFieldChange(props.field, newValue);
    }

    let fieldValue: boolean | null = null;
    const object: XObject | null = props.form.state.object;
    if (object !== null) {
        let objectValue = XUtilsCommon.getValueByPath(object, props.field);
        //  pri inserte noveho riadku su (zatial) vsetky fieldy undefined, dame na null, null je standard
        if (objectValue === undefined) {
            objectValue = null;
        }
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        fieldValue = objectValue;
    }

    // note: style overrides size (width of the input according to character count)
    return (
        <div className="p-field p-grid">
            <label htmlFor={props.field} className="p-col-fixed" style={{width:'150px'}}>{label}</label>
            <TriStateCheckbox id={props.field} value={fieldValue} onChange={onValueChange} disabled={readOnly} style={props.inputStyle}/>
        </div>
    );
}