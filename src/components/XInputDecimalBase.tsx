import React from "react";
import {InputNumber, InputNumberChangeEvent} from "primereact/inputnumber";

// wrapper for InputNumber component - zatial taky zjednoduseny, len na filter polozky pouzivame
export const XInputDecimalBase = (props: {id?: string; value: number | null; onChange: (value: number | null) => void; readOnly?: boolean;
                                            useGrouping?: boolean; fractionDigits?: number; min?: number; max?: number; size?: number;
                                            className?: string; inputStyle?: React.CSSProperties;}) => {

    const onChange = (e: InputNumberChangeEvent) => {
        // z InputNumber prichadza e.value - typ number alebo null
        props.onChange(e.value);
    }

    // null konvertujeme na undefined (zevraj InputNumber nechce null)
    return (
        <InputNumber id={props.id} value={props.value !== null ? props.value : undefined} onChange={onChange} readOnly={props.readOnly} mode="decimal" locale="de-DE"
                     useGrouping={props.useGrouping} minFractionDigits={props.fractionDigits} maxFractionDigits={props.fractionDigits} min={props.min} max={props.max} size={props.size}
                     className={props.className} inputStyle={props.inputStyle}/>
    );
}
