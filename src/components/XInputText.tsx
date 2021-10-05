import React from "react";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtils} from "./XUtils";
import {stringAsUI, stringFromUI} from "./XUtilsConversions";
import {XObject} from "./XObject";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {InputText} from "primereact/inputtext";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XField} from "../serverApi/XEntityMetadata";
import {XError} from "./XErrors";

export interface XInputTextProps extends XFormComponentProps {
    field: string;
    size?: number;
    inputStyle?: React.CSSProperties;
}

export class XInputText extends XFormComponent<XInputTextProps> {

    protected xField: XField;

    constructor(props: XInputTextProps) {
        super(props);

        this.xField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);

        props.form.addField(props.field);
    }

    // TODO - prerobit - len field nech vracia
    getFieldForEdit(): string | undefined {
        // TODO - zohladnit aj aktualny readOnly stav
        if (!XUtils.isReadOnly(this.props.field, this.props.readOnly)) {
            return this.props.field;
        }
        return undefined;
    }

    checkNotNull(): boolean {
        // TODO - zohladnit aj aktualny readOnly stav
        return !this.xField.isNullable && !XUtils.isReadOnly(this.props.field, this.props.readOnly);
    }

    getValueFromObject(): any {
        let objectValue: string | null = null;
        const object: XObject | null = this.props.form.state.object;
        if (object !== null) {
            objectValue = XUtilsCommon.getValueByPath(object, this.props.field);
            //  pre istotu dame na null, null je standard
            if (objectValue === undefined) {
                objectValue = null;
            }
        }
        return objectValue;
    }

    render() {
        const props = this.props;

        const xField = this.xField;

        let label = props.label ?? props.field;
        if (this.checkNotNull()) {
            label = XUtils.markNotNull(label);
        }

        const readOnly: boolean = XUtils.isReadOnly(props.field, props.readOnly);

        const size = props.size ?? xField.length;

        const labelStyle = props.labelStyle ?? {width: XUtils.FIELD_LABEL_WIDTH};

        const onValueChange = (e: any) => {
            const value = stringFromUI(e.target.value);
            const error: string | undefined = this.validateOnChange(value);
            props.form.onFieldChange(props.field, value, error);
        }

        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        const fieldValue: string = stringAsUI(this.getValueFromObject());

        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                <label htmlFor={props.field} className="col-fixed" style={labelStyle}>{label}</label>
                <InputText id={props.field} value={fieldValue} onChange={onValueChange} readOnly={readOnly} maxLength={xField.length} size={size} style={props.inputStyle}
                           {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}
