import React from "react";
import {XInput, XInputProps} from "./XInput";
import {XCheckboxBase} from "./XCheckboxBase";

export interface XCheckboxProps extends XInputProps<boolean> {
    // aby sme vedeli zobrazit dvojstavovy checkbox aj ked v DB mame null stlpec
    // zatial len sem mozno v buducnosti dame na vsetky komponenty
    isNotNull?: boolean;
}

export class XCheckbox extends XInput<boolean, XCheckboxProps> {

    constructor(props: XCheckboxProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    isNotNull(): boolean {
        return this.props.isNotNull || super.isNotNull();
    }

    getValue(): boolean | null {
        return this.getValueFromObject();
    }

    onValueChange(value: boolean | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        let element: JSX.Element = <XCheckboxBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                                                  readOnly={this.isReadOnly()} isNotNull={this.isNotNull()}
                                                  tooltip={this.props.tooltip} error={this.getError()} style={this.props.inputStyle}/>;

        if (!this.props.onlyInput) {
            const label: string | undefined = this.props.label; // nepridavame * ani ak je atribut not null (kedze sa pouziva jednoduchy checkbox, nie je mozne zadat null hodnotu)
            element =   <div className="field grid">
                            {label !== undefined ? <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                            {element}
                        </div>;
        }
        return element;
    }
}
