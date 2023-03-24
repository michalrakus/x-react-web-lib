import React from "react";
import {stringAsUI, stringFromUI} from "./XUtilsConversions";
import {InputText} from "primereact/inputtext";
import {XInput, XInputProps} from "./XInput";

export interface XInputTextProps extends XInputProps {
    size?: number;
}

export class XInputText extends XInput<XInputTextProps> {

    constructor(props: XInputTextProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string {
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        const value: string | null = this.getValueFromObject();
        return stringAsUI(value);
    }

    onValueChange(e: any) {
        const value: string | null = stringFromUI(e.target.value);
        this.onValueChangeBase(value);
    }

    render() {
        const size = this.props.size ?? this.xField.length;

        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <InputText id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} maxLength={this.xField.length} size={size} style={this.props.inputStyle}
                           {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}
