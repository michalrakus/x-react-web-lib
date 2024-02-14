import React from "react";
import {InputNumber} from "primereact/inputnumber";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponentProps} from "./XFormComponent";
import {XInput} from "./XInput";

export interface XInputDecimalProps extends XFormComponentProps<number> {
    field: string;
    size?: number;
    inputStyle?: React.CSSProperties;
}

export class XInputDecimal extends XInput<number, XInputDecimalProps> {

    constructor(props: XInputDecimalProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): number | undefined {
        let value: number | undefined = undefined;
        const objectValue: string | number | null = this.getValueFromObject();
        // tuto zatial hack, mal by prist number
        if (typeof objectValue === 'string') {
            value = parseFloat(objectValue);
        }
        else if (typeof objectValue === 'number') {
            value = objectValue;
        }
        // value zostalo undefined ak nebol vykonany ziaden if (konvertujeme null -> undefined) - InputNumber pozaduje undefined, nechce null
        return value;
    }

    onValueChange(e: any) {
        // z InputNumber prichadza e.value - typ number alebo null
        this.onValueChangeBase(e.value);
    }

    // nedame do onChange inputu, lebo by sa nas onChange volal po kazdej zmene pismenka
    // ak bude treba, mozme este dorobit metodu "onChange2", ktora sa bude volat po kazdej zmene pismenka (asi iba do XInputText)
    onBlur(e: any) {
        this.callOnChangeFromOnBlur();
    }

    render() {
        const {useGrouping, fractionDigits, min, max, size} = XUtilsMetadata.getParamsForInputNumber(this.xField);
        const sizeInput = this.props.size ?? size;

        // note: style overrides size (width of the input according to character count)
        const label: string | undefined = this.getLabel();
        return (
            <div className="field grid">
                {label !== undefined ? <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{label}</label> : null}
                <InputNumber id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} mode="decimal" locale="de-DE"
                             useGrouping={useGrouping} minFractionDigits={fractionDigits} maxFractionDigits={fractionDigits} min={min} max={max}
                             size={sizeInput} inputStyle={this.props.inputStyle} {...this.getClassNameTooltip()} onBlur={this.onBlur}/>
            </div>
        );
    }
}
