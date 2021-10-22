import {XObject} from "./XObject";
import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XUtils} from "./XUtils";
import {XFormComponentProps} from "./XFormComponent";

export interface XInputDecimalProps extends XFormComponentProps {
    field: string;
    size?: number;
    inputStyle?: React.CSSProperties;
}

export const XInputDecimal = (props: XInputDecimalProps) => {

    props.form.addField(props.field);

    const xField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);
    const {useGrouping, fractionDigits, min, max, size} = XUtilsMetadata.getParamsForInputNumber(xField);

    let label = props.label ?? props.field;
    const readOnly: boolean = XUtils.isReadOnly(props.field, props.readOnly);
    if (!xField.isNullable && !readOnly) {
        label = XUtils.markNotNull(label);
    }

    const sizeInput = props.size !== undefined ? props.size : size;

    const inline = props.inline ?? false;

    let labelStyle: React.CSSProperties = props.labelStyle ?? {};
    if (!inline) {
        XUtils.addCssPropIfNotExists(labelStyle, {width: XUtils.FIELD_LABEL_WIDTH});
    }
    else {
        XUtils.addCssPropIfNotExists(labelStyle, {width: 'auto'}); // podla dlzky labelu
        XUtils.addCssPropIfNotExists(labelStyle, {marginLeft: '1rem'});
    }

    const onValueChange = (e: any) => {
        // z InputNumber prichadza e.value - typ number alebo null
        props.form.onFieldChange(props.field, e.value);
    }

    let fieldValue: number | undefined = undefined;
    const object: XObject | null = props.form.state.object;
    if (object !== null) {
        let objectValue = XUtilsCommon.getValueByPath(object, props.field);
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

    // note: style overrides size (width of the input according to character count)
    return (
        <div className="field grid">
            <label htmlFor={props.field} className="col-fixed" style={labelStyle}>{label}</label>
            <InputNumber id={props.field} value={fieldValue} onChange={onValueChange} disabled={readOnly} mode="decimal" locale="de-DE"
                         useGrouping={useGrouping} minFractionDigits={fractionDigits} maxFractionDigits={fractionDigits} min={min} max={max}
                         size={sizeInput} style={props.inputStyle}/>
        </div>
    );
}