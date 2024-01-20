import React from "react";
import {stringAsUI, stringFromUI} from "../serverApi/XUtilsConversions";
import {InputText} from "primereact/inputtext";
import {XInput, XInputProps} from "./XInput";

export interface XInputTextProps extends XInputProps<string> {
    size?: number;
}

export class XInputText extends XInput<string, XInputTextProps> {

    constructor(props: XInputTextProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
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

    // nedame do onChange inputu, lebo by sa nas onChange volal po kazdej zmene pismenka
    // ak bude treba, mozme este dorobit metodu "onChange2", ktora sa bude volat po kazdej zmene pismenka (asi iba do XInputText)
    onBlur(e: any) {
        this.callOnChangeFromOnBlur();
    }

    render() {
        const size = this.props.size ?? this.xField.length;

        // note: style overrides size (width of the input according to character count)
        const label: string | undefined = this.getLabel();
        return (
            <div className="field grid">
                {label !== undefined ? <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                <InputText id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} maxLength={this.xField.length} size={size} style={this.props.inputStyle}
                           {...this.getClassNameTooltip()} onBlur={this.onBlur}/>
            </div>
        );
    }
}
