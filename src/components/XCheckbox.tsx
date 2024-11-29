import React from "react";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XInput, XInputProps} from "./XInput";
import {Checkbox, CheckboxChangeEvent} from "primereact/checkbox";

export interface XCheckboxProps extends XInputProps<boolean> {
    // aby sme vedeli zobrazit dvojstavovy checkbox aj ked v DB mame null stlpec
    // zatial len sem mozno v buducnosti dame na vsetky komponenty
    isNotNull?: boolean;
}

export class XCheckbox extends XInput<boolean, XCheckboxProps> {

    constructor(props: XCheckboxProps) {
        super(props);

        this.checkboxOnValueChange = this.checkboxOnValueChange.bind(this);
        this.triStateCheckboxOnValueChange = this.triStateCheckboxOnValueChange.bind(this);
    }

    isNotNull(): boolean {
        return this.props.isNotNull || super.isNotNull();
    }

    getValue(): boolean | null {
        // konvertovat null hodnotu na "" (vo funkcii stringAsUI) je dolezite aby sa prejavila zmena na null v modeli
        const value: boolean | null = this.getValueFromObject();
        return value;
    }

    checkboxOnValueChange(e: CheckboxChangeEvent) {
        this.onValueChangeBase(e.checked, this.props.onChange);
    }

    triStateCheckboxOnValueChange(e: any) {
        let newValue: boolean | null = e.value;
        // pri klikani na TriStateCheckbox prichadza v newValue cyklicky: true -> false -> null
        // ak mame not null atribut, tak pri null hodnote skocime rovno na true
        if (this.isNotNull()) {
            if (newValue === null) {
                newValue = true;
            }
        }

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        this.onValueChangeBase(newValue, this.props.onChange);
    }

    render() {
        // note: style overrides size (width of the input according to character count)
        // pre not null atributy pouzijeme standardny checkbox aby sme pre false mali prazdny biely checkbox - TODO - pomenit ikonky na TriStateCheckbox aby to pekne sedelo
        let element: JSX.Element = this.isNotNull()
            ? <Checkbox id={this.props.field} checked={this.getValue() ?? false} onChange={this.checkboxOnValueChange} disabled={this.isReadOnly()} style={this.props.inputStyle} tooltip={this.props.tooltip}/>
            : <TriStateCheckbox id={this.props.field} value={this.getValue()} onChange={this.triStateCheckboxOnValueChange} disabled={this.isReadOnly()} style={this.props.inputStyle} tooltip={this.props.tooltip}/>;

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
