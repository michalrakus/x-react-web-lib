import React from "react";
import {stringAsUI, stringFromUI} from "../serverApi/XUtilsConversions";
import {InputText} from "primereact/inputtext";
import {XInput, XInputProps} from "./XInput";
import {XUtils} from "./XUtils";
import {Tooltip} from "primereact/tooltip";

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

        const label: string | undefined = this.getLabel();
        const value: string | null = this.getValueFromObject(); // we do not use this.getValue(), because this.getValue() returns "" if the value is null

        const {labelTooltip, labelElemId, inputTooltip} = this.getTooltipsAndLabelElemId(
            this.props.field, label, value, this.props.labelTooltip, this.props.tooltip, this.props.desc);

        const size = this.props.size ?? this.xField.length;

        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                {label !== undefined ? <label id={labelElemId} htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                {labelTooltip ? <Tooltip target={`#${labelElemId}`} content={labelTooltip}/> : null}
                <InputText id={this.props.field} value={this.getValue()} onChange={this.onValueChange} onBlur={this.onBlur}
                           readOnly={this.isReadOnly()} maxLength={this.xField.length} size={size} style={this.props.inputStyle}
                           {...XUtils.createTooltipOrErrorProps(this.getError(), inputTooltip)} placeholder={this.props.placeholder ?? this.props.desc}/>
            </div>
        );
    }
}
