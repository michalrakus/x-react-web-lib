import React from "react";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XInput, XInputProps} from "./XInput";

export class XCheckbox extends XInput<XInputProps> {

    constructor(props: XInputProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): boolean | null {
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        const value: boolean | null = this.getValueFromObject();
        return value;
    }

    onValueChange(e: any) {
        let newValue: boolean | null = e.value;
        // pri klikani na TriStateCheckbox prichadza v newValue cyklicky: true -> false -> null
        // ak mame not null atribut, tak pri null hodnote skocime rovno na true
        if (this.isNotNull()) {
            if (newValue === null) {
                newValue = true;
            }
        }

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        this.onValueChangeBase(newValue);
    }

    render() {
        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <TriStateCheckbox id={this.props.field} value={this.getValue()} onChange={this.onValueChange} disabled={this.isReadOnly()} style={this.props.inputStyle}/>
            </div>
        );
    }
}
