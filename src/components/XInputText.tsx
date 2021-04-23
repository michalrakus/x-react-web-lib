import React from "react";
import {InputText} from "primereact/inputtext";
import {XFormBase} from "./XFormBase";
import { XObject } from "./XObject";
import {stringAsUI, stringFromUI} from "./XUtilsConversions";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export const XInputText = (props: {form: XFormBase; field: string; label?: string; readOnly?: boolean; size?: number; labelStyle?: React.CSSProperties; inputStyle?: React.CSSProperties;}) => {

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

    const size = props.size !== undefined ? props.size : xField.length;

    const labelStyle = props.labelStyle ?? {width:'150px'};

    const onValueChange = (e: any) => {
        props.form.onFieldChange(props.field, stringFromUI(e.target.value));
    }

    let fieldValue = "";
    const object: XObject | null = props.form.state.object;
    if (object !== null) {
        let objectValue = XUtilsCommon.getValueByPath(object, props.field);
        //  pre istotu dame na null, null je standard
        if (objectValue === undefined) {
            objectValue = null;
        }
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        fieldValue = stringAsUI(objectValue);
    }

    // note: style overrides size (width of the input according to character count)
    return (
        <div className="p-field p-grid">
            <label htmlFor={props.field} className="p-col-fixed" style={labelStyle}>{label}</label>
            <InputText id={props.field} value={fieldValue} onChange={onValueChange} readOnly={readOnly} maxLength={xField.length} size={size} style={props.inputStyle}/>
        </div>
    );
}