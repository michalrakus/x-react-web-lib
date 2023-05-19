import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React from "react";
import {Calendar} from "primereact/calendar";
import {dateFormatCalendar} from "./XUtilsConversions";
import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XUtils} from "./XUtils";

export const XInputDate = (props: {form: XFormBase; field: string; label?: string; readOnly?: boolean; labelStyle?: React.CSSProperties;}) => {

    props.form.addField(props.field);

    const xField: XField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);
    const showTime: boolean = (xField.type === 'datetime');
    const cssClassName = showTime ? 'x-input-datetime' : 'x-input-date';

    let label = props.label ?? props.field;
    const readOnly: boolean = XUtils.isReadOnly(props.field, props.readOnly) || props.form.formReadOnlyBase(props.field);
    if (!xField.isNullable && !readOnly) {
        label = XUtils.markNotNull(label);
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
        let objectValue = XUtilsCommon.getValueByPath(object, props.field);
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

    let labelStyle: React.CSSProperties = props.labelStyle ?? {};
    XUtils.addCssPropIfNotExists(labelStyle, {width: XUtils.FIELD_LABEL_WIDTH});

    return (
        <div className="field grid">
            <label htmlFor={props.field} className="col-fixed" style={labelStyle}>{label}</label>
            <Calendar id={props.field} value={fieldValue} onChange={onValueChange} disabled={readOnly} showIcon={true}
                      dateFormat={dateFormatCalendar()} showTime={showTime} showSeconds={showTime} inputClassName={cssClassName} showOnFocus={false}/>
        </div>
    );
}